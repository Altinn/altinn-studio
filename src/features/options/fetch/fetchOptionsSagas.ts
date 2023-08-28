import { call, fork, put, race, select, take } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { OptionsActions } from 'src/features/options/optionsSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import {
  getKeyIndex,
  getKeyWithoutIndex,
  getKeyWithoutIndexIndicators,
  replaceIndexIndicatorsWithIndexes,
} from 'src/utils/databindings';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getOptionLookupKey, getOptionLookupKeys } from 'src/utils/options';
import { selectNotNull } from 'src/utils/sagas';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { IFormData } from 'src/features/formData';
import type { IUpdateFormData } from 'src/features/formData/formDataTypes';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IOption, ISelectionComponent } from 'src/layout/common.generated';
import type { ILayouts } from 'src/layout/layout';
import type { IFetchSpecificOptionSaga, IOptions, IOptionsMetaData, IRepeatingGroups, IRuntimeState } from 'src/types';

export const formLayoutSelector = (state: IRuntimeState): ILayouts | null => state.formLayout?.layouts;
export const formDataSelector = (state: IRuntimeState) => state.formData.formData;
export const optionsSelector = (state: IRuntimeState): IOptions => state.optionState.options;
export const optionsWithIndexIndicatorsSelector = (state: IRuntimeState) =>
  state.optionState.optionsWithIndexIndicators;
export const instanceIdSelector = (state: IRuntimeState): string | undefined => state.instanceData.instance?.id;
export const repeatingGroupsSelector = (state: IRuntimeState) => state.formLayout?.uiConfig.repeatingGroups;

export function* watchFinishedLoadingSaga(): SagaIterator {
  let optionCount = 0;
  let fulfilledCount = 0;
  while (true) {
    const [fetch, fulfilled] = yield race([take(OptionsActions.fetching), take(OptionsActions.fetchFulfilled)]);
    if (fetch) {
      optionCount++;
    }
    if (fulfilled) {
      fulfilledCount++;
    }
    if (optionCount === fulfilledCount) {
      yield put(OptionsActions.loaded());
    }
  }
}

export function* fetchOptionsSaga(): SagaIterator {
  const layouts: ILayouts = yield selectNotNull(formLayoutSelector);
  const repeatingGroups: IRepeatingGroups = yield selectNotNull(repeatingGroupsSelector);
  const fetchedOptions: string[] = [];
  const optionsWithIndexIndicators: IOptionsMetaData[] = [];
  for (const layoutId of Object.keys(layouts)) {
    for (const element of layouts[layoutId] || []) {
      const { optionsId, mapping, queryParameters, secure } = element as ISelectionComponent;

      // if we have index indicators we get up the lookup keys for existing indexes
      const { keys, keyWithIndexIndicator } =
        (optionsId &&
          getOptionLookupKeys({
            id: optionsId,
            mapping,
            fixedQueryParameters: queryParameters,
            secure,
            repeatingGroups,
          })) ||
        {};

      if (keyWithIndexIndicator) {
        optionsWithIndexIndicators.push(keyWithIndexIndicator);
      }

      if (!keys?.length) {
        continue;
      }

      for (const optionObject of keys) {
        const { id, mapping, fixedQueryParameters, secure } = optionObject;
        const lookupKey = getOptionLookupKey({ id, mapping, fixedQueryParameters });
        if (optionsId && !fetchedOptions.includes(lookupKey)) {
          yield fork(fetchSpecificOptionSaga, {
            optionsId,
            dataMapping: mapping,
            fixedQueryParameters: queryParameters,
            secure,
          });
          fetchedOptions.push(lookupKey);
        }
      }
    }
  }
  if (fetchedOptions.length == 0) {
    yield put(OptionsActions.loaded());
  }
  yield put(
    OptionsActions.setOptionsWithIndexIndicators({
      optionsWithIndexIndicators,
    }),
  );
}

export function* fetchSpecificOptionSaga({
  optionsId,
  dataMapping,
  fixedQueryParameters,
  secure,
}: IFetchSpecificOptionSaga): SagaIterator {
  const key = getOptionLookupKey({ id: optionsId, mapping: dataMapping, fixedQueryParameters });
  const instanceId = yield select(instanceIdSelector);
  try {
    const metaData: IOptionsMetaData = {
      id: optionsId,
      mapping: dataMapping,
      fixedQueryParameters,
      secure,
    };
    yield put(OptionsActions.fetching({ key, metaData }));
    const formData: IFormData = yield select(formDataSelector);
    const langTools: IUseLanguage = yield select(staticUseLanguageFromState);
    const language = langTools.selectedLanguage;
    const url = getOptionsUrl({
      optionsId,
      formData,
      language,
      dataMapping,
      fixedQueryParameters,
      secure,
      instanceId,
    });

    const options: IOption[] = yield call(httpGet, url);
    yield put(OptionsActions.fetchFulfilled({ key, options }));
  } catch (error) {
    yield put(OptionsActions.fetchRejected({ key, error }));
  }
}

export function* checkIfOptionsShouldRefetchSaga({ payload: { field } }: PayloadAction<IUpdateFormData>): SagaIterator {
  const options: IOptions = yield select(optionsSelector);
  const optionsWithIndexIndicators = yield select(optionsWithIndexIndicatorsSelector);
  let foundInExistingOptions = false;
  for (const optionsKey of Object.keys(options)) {
    const { mapping, fixedQueryParameters, id, secure } = options[optionsKey] || {};
    if (!id) {
      continue;
    }

    if (mapping && Object.keys(mapping).includes(field)) {
      foundInExistingOptions = true;
      yield fork(fetchSpecificOptionSaga, {
        optionsId: id,
        dataMapping: mapping,
        fixedQueryParameters,
        secure,
      });
    }
  }

  if (foundInExistingOptions) {
    // the field is found in existing options, no need to new up a new index for groups
    return;
  }

  for (const option of optionsWithIndexIndicators) {
    const { mapping, fixedQueryParameters, id, secure } = option;
    if (
      mapping &&
      Object.keys(mapping)
        .map((key) => getKeyWithoutIndexIndicators(key))
        .includes(getKeyWithoutIndex(field))
    ) {
      const keys = getKeyIndex(field);
      const newDataMapping = {};

      for (const key of Object.keys(mapping)) {
        newDataMapping[replaceIndexIndicatorsWithIndexes(key, keys)] = mapping[key];
      }
      yield fork(fetchSpecificOptionSaga, {
        optionsId: id,
        dataMapping: newDataMapping,
        fixedQueryParameters,
        secure,
      });
    }
  }
}
