import { SagaIterator } from 'redux-saga';
import { fork, call, select, takeLatest, takeEvery } from 'redux-saga/effects';
import { IRuntimeState, IOption, IFetchSpecificOptionSaga, IOptionData, IOptions } from 'src/types';
import { ILayouts, ISelectionComponentProps } from 'src/features/form/layout';
import { get } from 'altinn-shared/utils';
import { getOptionsUrl } from '../../../../utils/appUrlHelper';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import * as fetchOptionActionTypes from './fetchOptionsActionTypes';
import OptionsActions from '../optionsActions';
import FormDataActions from 'src/features/form/data/formDataActions';
import { IUpdateFormDataFulfilled } from 'src/features/form/data/formDataTypes';
import { PayloadAction } from '@reduxjs/toolkit';
import { IFormData } from 'src/features/form/data/formDataReducer';
import { getOptionLookupKey } from 'src/utils/options';

export const formLayoutSelector = (state: IRuntimeState): ILayouts =>
  state.formLayout.layouts;
export const formDataSelector = (state: IRuntimeState) => state.formData.formData;
export const userLanguageSelector = (state: IRuntimeState) =>
  state.profile.profile.profileSettingPreference.language;
export const optionsSelector = (state: IRuntimeState): IOptions => state.optionState.options;
export const instanceIdSelector = (state: IRuntimeState): string => state.instanceData.instance?.id;

export function* fetchOptionsSaga(): SagaIterator {
  const layouts: ILayouts = yield select(formLayoutSelector);
  const fetchedOptions: string[] = [];
  for (const layoutId of Object.keys(layouts)) {
    for (const element of layouts[layoutId]) {
      const component = element as ISelectionComponentProps;

      if (
        component.optionsId &&
        fetchedOptions.indexOf(component.optionsId) === -1
      ) {
        yield fork(fetchSpecificOptionSaga, {
          optionsId: component.optionsId,
          dataMapping: component.mapping,
          secure: component.secure,
        });
        fetchedOptions.push(component.optionsId);
      }
    }
  }
}

export function* fetchSpecificOptionSaga({
  optionsId,
  dataMapping,
  secure
}: IFetchSpecificOptionSaga): SagaIterator {
  const optionKey = getOptionLookupKey(optionsId, dataMapping);
  const instanceId = yield select(instanceIdSelector);
  try {
    yield call(OptionsActions.fetchingOptions, optionKey);
    const formData: IFormData = yield select(formDataSelector);
    const language: string = yield select(userLanguageSelector);
    const url = getOptionsUrl({ optionsId, formData, language, dataMapping, secure, instanceId });
    const options: IOption[] = yield call(get, url);
    const optionData: IOptionData = {
      id: optionsId,
      options,
      mapping: dataMapping,
      secure,
    };
    yield call(OptionsActions.fetchOptionsFulfilled, optionKey, optionData);
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, optionKey, error);
  }
}

export function* checkIfOptionsShouldRefetchSaga({
  payload: {
    field
  },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  const options: IOptions = yield select(optionsSelector);

  for (const optionsKey of Object.keys(options)) {
    const dataMapping = options[optionsKey].mapping;
    const optionsId = options[optionsKey].id;
    const secure = options[optionsKey].secure;
    if (dataMapping && Object.keys(dataMapping).includes(field)) {
      yield fork(fetchSpecificOptionSaga, {
        optionsId,
        dataMapping,
        secure,
      });
    }
  }
}

export function* watchCheckIfOptionsShouldRefetchSaga(): SagaIterator {
  yield takeEvery([
    FormDataActions.updateFormDataFulfilled,
    FormDataActions.updateFormDataSkipAutosave
  ], checkIfOptionsShouldRefetchSaga);
}

export function* watchInitialFetchOptionSaga(): SagaIterator {
  yield takeLatest(
    FormLayoutActions.fetchLayoutFulfilled,
    OptionsActions.fetchOptions,
  );
}

export function* watchFetchOptionsSaga(): SagaIterator {
  yield takeLatest(fetchOptionActionTypes.FETCH_OPTIONS, fetchOptionsSaga);
}
