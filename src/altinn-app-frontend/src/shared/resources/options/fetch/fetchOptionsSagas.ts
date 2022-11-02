import { call, fork, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { OptionsActions } from 'src/shared/resources/options/optionsSlice';
import { getOptionsUrl } from 'src/utils/appUrlHelper';
import {
  getKeyIndex,
  getKeyWithoutIndex,
  getKeyWithoutIndexIndicators,
  replaceIndexIndicatorsWithIndexes,
} from 'src/utils/databindings';
import { getOptionLookupKey, getOptionLookupKeys } from 'src/utils/options';
import { selectNotNull } from 'src/utils/sagas';
import type { IFormData } from 'src/features/form/data';
import type { IUpdateFormDataFulfilled } from 'src/features/form/data/formDataTypes';
import type {
  ILayouts,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import type {
  IFetchSpecificOptionSaga,
  IOption,
  IOptions,
  IOptionsMetaData,
  IRepeatingGroups,
  IRuntimeState,
} from 'src/types';

import { get } from 'altinn-shared/utils';

export const formLayoutSelector = (state: IRuntimeState): ILayouts | null =>
  state.formLayout?.layouts;
export const formDataSelector = (state: IRuntimeState) =>
  state.formData.formData;
export const optionsSelector = (state: IRuntimeState): IOptions =>
  state.optionState.options;
export const optionsWithIndexIndicatorsSelector = (state: IRuntimeState) =>
  state.optionState.optionsWithIndexIndicators;
export const instanceIdSelector = (state: IRuntimeState): string | undefined =>
  state.instanceData.instance?.id;
export const repeatingGroupsSelector = (state: IRuntimeState) =>
  state.formLayout?.uiConfig.repeatingGroups;

export function* fetchOptionsSaga(): SagaIterator {
  const layouts: ILayouts = yield selectNotNull(formLayoutSelector);
  const repeatingGroups: IRepeatingGroups = yield selectNotNull(
    repeatingGroupsSelector,
  );

  const fetchedOptions: string[] = [];
  const optionsWithIndexIndicators: IOptionsMetaData[] = [];

  for (const layoutId of Object.keys(layouts)) {
    for (const element of layouts[layoutId] || []) {
      const { optionsId, mapping, secure } =
        element as ISelectionComponentProps;

      // if we have index indicators we get up the lookup keys for existing indexes
      const { keys, keyWithIndexIndicator } =
        (optionsId &&
          getOptionLookupKeys({
            id: optionsId,
            mapping,
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
        const { id, mapping, secure } = optionObject;
        const lookupKey = getOptionLookupKey({ id, mapping });
        if (optionsId && !fetchedOptions.includes(lookupKey)) {
          yield fork(fetchSpecificOptionSaga, {
            optionsId,
            dataMapping: mapping,
            secure,
          });
          fetchedOptions.push(lookupKey);
        }
      }
    }
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
  secure,
}: IFetchSpecificOptionSaga): SagaIterator {
  const key = getOptionLookupKey({ id: optionsId, mapping: dataMapping });
  const instanceId = yield select(instanceIdSelector);
  try {
    const metaData: IOptionsMetaData = {
      id: optionsId,
      mapping: dataMapping,
      secure,
    };
    yield put(OptionsActions.fetching({ key, metaData }));
    const formData: IFormData = yield select(formDataSelector);
    const language = yield select(appLanguageStateSelector);
    const url = getOptionsUrl({
      optionsId,
      formData,
      language,
      dataMapping,
      secure,
      instanceId,
    });

    const options: IOption[] = yield call(get, url);
    yield put(OptionsActions.fetchFulfilled({ key, options }));
  } catch (error) {
    yield put(OptionsActions.fetchRejected({ key: key, error }));
  }
}

export function* checkIfOptionsShouldRefetchSaga({
  payload: { field },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  const options: IOptions = yield select(optionsSelector);
  const optionsWithIndexIndicators = yield select(
    optionsWithIndexIndicatorsSelector,
  );

  let foundInExistingOptions = false;
  for (const optionsKey of Object.keys(options)) {
    const { mapping, id, secure } = options[optionsKey] || {};
    if (!id) {
      continue;
    }

    if (mapping && Object.keys(mapping).includes(field)) {
      foundInExistingOptions = true;
      yield fork(fetchSpecificOptionSaga, {
        optionsId: id,
        dataMapping: mapping,
        secure,
      });
    }
  }

  if (foundInExistingOptions) {
    // the field is found in existing options, no need to new up a new index for groups
    return;
  }

  for (const option of optionsWithIndexIndicators) {
    const { mapping, id, secure } = option;
    if (
      mapping &&
      Object.keys(mapping)
        .map((key) => getKeyWithoutIndexIndicators(key))
        .includes(getKeyWithoutIndex(field))
    ) {
      const keys = getKeyIndex(field);
      const newDataMapping = {};

      for (const key of Object.keys(mapping)) {
        newDataMapping[replaceIndexIndicatorsWithIndexes(key, keys)] =
          mapping[key];
      }
      yield fork(fetchSpecificOptionSaga, {
        optionsId: id,
        dataMapping: newDataMapping,
        secure,
      });
    }
  }
}
