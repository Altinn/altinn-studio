import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';

import * as UpdateFormData from './update';

export interface IFormDataActions extends ActionCreatorsMapObject {
  updateFormData: (field: string, data: any) => UpdateFormData.IUpdateFormData;
  updateFormDataFulfilled: (field: string, data: any) => UpdateFormData.IUpdateFormDataFulfilled;
  updateFormDataRejected: (error: Error) => UpdateFormData.IUpdateFormDataRejected;
};

const actions: IFormDataActions = {
  updateFormData: UpdateFormData.updateFormData,
  updateFormDataFulfilled: UpdateFormData.updateFormDataFulfilled,
  updateFormDataRejected: UpdateFormData.updateFormDataRejected,
}

const FormDataActions: IFormDataActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormDataActions;