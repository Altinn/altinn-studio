import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';
import * as FetchFormData from './fetch/fetchFormDataActions';
import * as SubmitFormData from './submit/submitFormDataActions';
import * as UpdateFormData from './update/updateFormDataActions';

export interface IFormDataActions extends ActionCreatorsMapObject {
  updateFormData: (field: string, data: any, componentId: string) => UpdateFormData.IUpdateFormData;
  updateFormDataFulfilled: (field: string, data: any) => UpdateFormData.IUpdateFormDataFulfilled;
  updateFormDataRejected: (error: Error) => UpdateFormData.IUpdateFormDataRejected;
  saveFormData: () => Action;
  submitFormData: (url: string, apiMode?: string) => SubmitFormData.ISubmitDataAction;
  submitFormDataFulfilled: () => Action;
  submitFormDataRejected: (error: Error) => SubmitFormData.ISubmitFormDataRejected;
  fetchFormData: (url: string) => FetchFormData.IFetchFormData;
  fetchFormDataFulfilled: (formData: any) => FetchFormData.IFetchFormDataFulfilled;
  fetchFormDataRejected: (error: Error) => FetchFormData.IFetchFormDataRejected;
  fetchFormDataInitial: () => Action;
}

const actions: IFormDataActions = {
  updateFormData: UpdateFormData.updateFormData,
  updateFormDataFulfilled: UpdateFormData.updateFormDataFulfilled,
  updateFormDataRejected: UpdateFormData.updateFormDataRejected,
  saveFormData: SubmitFormData.saveFormdata,
  submitFormData: SubmitFormData.submitFormData,
  submitFormDataFulfilled: SubmitFormData.submitFormDataFulfilled,
  submitFormDataRejected: SubmitFormData.submitFormDataRejected,
  fetchFormData: FetchFormData.fetchFormData,
  fetchFormDataFulfilled: FetchFormData.fetchFormDataFulfilled,
  fetchFormDataRejected: FetchFormData.fetchFormDataRejected,
  fetchFormDataInitial: FetchFormData.fetchFormDataInitial,
};

const FormDataActions: IFormDataActions = bindActionCreators<any, IFormDataActions>(actions, store.dispatch);

export default FormDataActions;
