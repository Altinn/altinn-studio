import { SagaIterator } from 'redux-saga';
import { takeLatest, select, call } from 'redux-saga/effects';
import { IFormData } from 'src/features/form/data/formDataReducer';
import { IRuntimeState } from 'src/types';
import { replaceTextResourceParams } from 'altinn-shared/utils/language';
import { ITextResource } from 'altinn-shared/types';
import * as FormDataActionTypes from '../../../../features/form/data/formDataActionTypes';
import TextResourceActions from '../textResourcesActions';
import { ITextResourcesState } from '../textResourcesReducer';

export const FormDataSelector: (store: IRuntimeState) => IFormData = (store) => store.formData.formData;
export const TextResourcesSelector: (store: IRuntimeState) => ITextResourcesState
  = (store) => store.textResources;


export function* parseText(): SagaIterator {
  try {
    const formData: IFormData = yield select(FormDataSelector);
    const textResources: ITextResourcesState = yield select(TextResourcesSelector);
    const updatedTextsResources: ITextResource[] =
      replaceTextResourceParams([...textResources.resources], { dataModel: formData });
    yield call(TextResourceActions.replaceTextResourcesFulfilled, textResources.language, updatedTextsResources);
  } catch (error) {
    yield call(TextResourceActions.replaceTextResourcesRejected, error);
  }
}

export function* watchFetchFormDataFulfilled(): SagaIterator {
  yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED, parseText);
  yield takeLatest(FormDataActionTypes.UPDATE_FORM_DATA_FULFILLED, parseText);
}
