import {
  combineReducers,
  Reducer,
  ReducersMapObject,
} from 'redux';
import FormConfigState, { IFormConfigState } from '../features/form/config/reducer';
import FormDataReducer, { IFormDataState } from '../features/form/data/reducer';
import FormDataModel, { IDataModelState } from '../features/form/datamodell/reducer';
import { IFormDynamicState } from '../features/form/dynamics';
import FormDynamics from '../features/form/dynamics/reducer';
import FormFileUploadReducer, { IFormFileUploadState } from '../features/form/fileUpload/reducer';
import FormLayoutReducer, { ILayoutState } from '../features/form/layout/reducer';
import FormResourceReducer, { IResourceState } from '../features/form/resources/reducer';
import FormRuleReducer, { IFormRuleState } from '../features/form/rules/reducer';
import FormUserReducer, { IFormUserState } from '../features/form/user/reducer';
import ValidationReducer, { IValidationState } from '../features/form/validation/reducer';
import FormWorkflowReducer, { IWorkflowState } from '../features/form/workflow/reducer';
import LanguageReducer, { ILanguageState } from '../features/languages/reducer';

export interface IReducers<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12> {
  formLayout: T1;
  formData: T2;
  formConfig: T3;
  formWorkflow: T4;
  formDataModel: T5;
  formAttachments: T6;
  formDynamics: T7;
  formRules?: T8;
  language: T9;
  formResources: T10;
  formUser: T11;
  formValidations: T12;
}

export interface IRuntimeReducers extends IReducers<
  Reducer<ILayoutState>,
  Reducer<IFormDataState>,
  Reducer<IFormConfigState>,
  Reducer<IWorkflowState>,
  Reducer<IDataModelState>,
  Reducer<IFormFileUploadState>,
  Reducer<IFormDynamicState>,
  Reducer<IFormRuleState>,
  Reducer<ILanguageState>,
  Reducer<IResourceState>,
  Reducer<IFormUserState>,
  Reducer<IValidationState>
  >,
  ReducersMapObject {
}

const reducers: IRuntimeReducers = {
  formLayout: FormLayoutReducer,
  formData: FormDataReducer,
  formConfig: FormConfigState,
  formWorkflow: FormWorkflowReducer,
  formDataModel: FormDataModel,
  formAttachments: FormFileUploadReducer,
  formDynamics: FormDynamics,
  formRules: FormRuleReducer,
  language: LanguageReducer,
  formResources: FormResourceReducer,
  formUser: FormUserReducer,
  formValidations: ValidationReducer,
};

export default combineReducers(reducers);
