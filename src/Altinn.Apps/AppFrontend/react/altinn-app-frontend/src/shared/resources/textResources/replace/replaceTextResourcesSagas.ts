import { SagaIterator } from "redux-saga";
import { takeLatest, select } from "redux-saga/effects";
import { IFormData } from "src/features/form/data/formDataReducer";
import { IRuntimeState } from 'src/types';
import { ITextResource } from "altinn-shared/types";
import * as FormDataActionTypes from '../../../../features/form/data/formDataActionTypes';
export const FormDataSelector: (store: IRuntimeState) => IFormData = (store) => store.formData.formData;
export const TextResourcesSelector: (store: IRuntimeState) => ITextResource[] = (store) => store.textResources.resources;


export function* parseText(): SagaIterator {
  const formData: IFormData = yield select(FormDataSelector);
  const resource: ITextResource[] = yield select(TextResourcesSelector);
  replaceTextResourceParams(resource, formData);

}

export function* watchFetchFormDataFulfilled(): SagaIterator {
 yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED , parseText);
 yield takeLatest(FormDataActionTypes.UPDATE_FORM_DATA_FULFILLED, parseText);
}

function replaceTextResourceParams(textResources: ITextResource[], formData: IFormData): void {
  textResources.forEach(resource => {
    if(resource.variables != null){
      var replaceValues: string[] = [];
      resource.variables.forEach(variable => {
        if(variable.dataSource.startsWith('dataModel')){
          replaceValues.push(formData[variable.key] ? formData[variable.key] : variable.key);
        }
      });

      var newValue: string = replaceParametersNullIndex(resource.unparsedValue, replaceValues);
      if(resource.value != newValue){
        resource.value = newValue;
      }

      resource.value =replaceParametersNullIndex(resource.unparsedValue, replaceValues);
    }
  });
}

  const replaceParametersNullIndex = (nameString: any, params: any[]) => {
    let index = 0;
    for (const param of params) {
      nameString = nameString.replace(`{${index}}`, param);
      index++;
    }
    return nameString;
  };
