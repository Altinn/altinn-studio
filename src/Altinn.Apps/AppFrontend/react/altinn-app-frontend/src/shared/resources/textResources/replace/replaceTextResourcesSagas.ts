import { SagaIterator } from "redux-saga";
import { takeLatest, select } from "redux-saga/effects";
import { IFormData } from "src/features/form/data/formDataReducer";
import { IRuntimeState } from 'src/types';
import { ITextResource } from "altinn-shared/types";
import * as FormDataActionTypes from '../../../../features/form/data/formDataActionTypes';
import { replaceTextResourceParams } from "altinn-shared/utils/language";
export const FormDataSelector: (store: IRuntimeState) => IFormData = (store) => store.formData.formData;
export const TextResourcesSelector: (store: IRuntimeState) => ITextResource[] = (store) => store.textResources.resources;


export function* parseText(): SagaIterator {
  const formData: IFormData = yield select(FormDataSelector);
  const resource: ITextResource[] = yield select(TextResourcesSelector);
  replaceTextResourceParams(resource, {'dataModel': formData});
}

export function* watchFetchFormDataFulfilled(): SagaIterator {
 yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED , parseText);
 yield takeLatest(FormDataActionTypes.UPDATE_FORM_DATA_FULFILLED, parseText);
}
