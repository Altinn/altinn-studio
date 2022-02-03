import { SagaIterator } from 'redux-saga';
import { fork, call, select, takeLatest, takeEvery } from 'redux-saga/effects';
import { IRuntimeState, IOption, IFetchSpecificOptionSaga, IOptionData, IOptions } from 'src/types';
import { ILayouts } from 'src/features/form/layout';
import { get } from 'altinn-shared/utils';
import { getOptionsUrl } from '../../../../utils/appUrlHelper';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import * as fetchOptionActionTypes from './fetchOptionsActionTypes';
import OptionsActions from '../optionsActions';
import FormDataActions from 'src/features/form/data/formDataActions';
import { IUpdateFormDataFulfilled } from 'src/features/form/data/formDataTypes';
import { PayloadAction } from '@reduxjs/toolkit';
import { IFormData } from 'src/features/form/data/formDataReducer';

export const formLayoutSelector = (state: IRuntimeState): ILayouts =>
  state.formLayout.layouts;
export const formDataSelector = (state: IRuntimeState) => state.formData.formData;
export const userLanguageSelector = (state: IRuntimeState) =>
  state.profile.profile.profileSettingPreference.language;
export const optionsSelector = (state: IRuntimeState): IOptions => state.optionState.options;

export function* fetchOptionsSaga(): SagaIterator {
  try {
    const layouts: ILayouts = yield select(formLayoutSelector);
    const formData = yield select(formDataSelector);
    const language = yield select(userLanguageSelector);

    const fetchedOptions: string[] = [];
    for (const layoutId of Object.keys(layouts)) {
      for (const element of layouts[layoutId]) {
        const component = element as any;

        if (
          component.optionsId &&
          fetchedOptions.indexOf(component.optionsId) === -1
        ) {
          yield fork(fetchSpecificOptionSaga, {
            optionsId: component.optionsId,
            formData,
            dataMapping: component?.mapping,
            language,
          });
          fetchedOptions.push(component.optionsId);
        }
      }
    }
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, error);
  }
}

export function* fetchSpecificOptionSaga({
  optionsId,
  formData,
  language,
  dataMapping,
}: IFetchSpecificOptionSaga): SagaIterator {
  try {
    const url = getOptionsUrl({ optionsId, formData, language, dataMapping });
    const options: IOption[] = yield call(get, url);
    const optionData: IOptionData = {
      options,
      mapping: dataMapping,
    }
    yield call(OptionsActions.fetchOptionsFulfilled, optionsId, optionData);
  } catch (error) {
    yield call(OptionsActions.fetchOptionsRejected, error);
  }
}

export function* checkIfOptionsShouldRefetchSaga({
  payload: {
    field
  },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  const formData: IFormData = yield select(formDataSelector);
  const language: string = yield select(userLanguageSelector);
  const options: IOptions = yield select(optionsSelector);

  for (const optionsId of Object.keys(options)) {
    const dataMapping = options[optionsId].mapping;
    if (dataMapping && Object.keys(dataMapping).includes(field)) {
      yield fork(fetchSpecificOptionSaga, {
        optionsId,
        formData,
        dataMapping,
        language,
      });
    }
  }
}

export function* watchCheckIfOptionsShouldRefetchSaga(): SagaIterator {
  yield takeEvery(FormDataActions.updateFormDataFulfilled, checkIfOptionsShouldRefetchSaga);
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
