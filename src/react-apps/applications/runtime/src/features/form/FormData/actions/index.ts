import { ActionCreatorsMapObject, bindActionCreators, Action } from 'redux';
import { store } from '../../../../store';

import * as UpdateFormData from './update';
import * as SubmitFormData from './submit';
import * as FetchFormData from './fetch';

export interface IFormDataActions extends ActionCreatorsMapObject {
  updateFormData: (field: string, data: any) => UpdateFormData.IUpdateFormData;
  updateFormDataFulfilled: (field: string, data: any) => UpdateFormData.IUpdateFormDataFulfilled;
  updateFormDataRejected: (error: Error) => UpdateFormData.IUpdateFormDataRejected;
  submitFormData: (url: string) => SubmitFormData.ISumbitDataAction;
  submitFormDataFulfilled: () => Action;
  submitFormDataRejected: (error: Error) => SubmitFormData.ISubmitFormDataRejected;
  fetchFormData: (url: string) => FetchFormData.IFetchFormData;
  fetchFormDataFulfilled: (formData: any) => FetchFormData.IFetchFormDataFulfilled,
  fetchFormDataRejected: (error: Error) => FetchFormData.IFetchFormDataRejected 
};

const actions: IFormDataActions = {
  updateFormData: UpdateFormData.updateFormData,
  updateFormDataFulfilled: UpdateFormData.updateFormDataFulfilled,
  updateFormDataRejected: UpdateFormData.updateFormDataRejected,
  submitFormData: SubmitFormData.submitFormData,
  submitFormDataFulfilled: SubmitFormData.submitFormDataFulfilled,
  submitFormDataRejected: SubmitFormData.submitFormDataRejected,
  fetchFormData: FetchFormData.fetchFormData,
  fetchFormDataFulfilled: FetchFormData.fetchFormDataFulfilled,
  fetchFormDataRejected: FetchFormData.fetchFormDataRejected,
}

const FormDataActions: IFormDataActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormDataActions;