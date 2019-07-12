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
import FormLayoutReducer, { ILayoutState } from '../features/form/layout/reducer';
import FormResourceReducer, { IResourceState } from '../features/form/resources/reducer';
import FormRuleReducer, { IFormRuleState } from '../features/form/rules/reducer';
import ValidationReducer, { IValidationState } from '../features/form/validation/reducer';
import FormWorkflowReducer, { IWorkflowState } from '../features/form/workflow/reducer';
import AttachmentReducer, { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import LanguageReducer, { ILanguageState } from '../shared/resources/language/languageReducers';
import ProfileReducer, { IProfileState } from '../shared/resources/profile/profileReducers';

export interface IReducers<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12> {
  formLayout: T1;
  formData: T2;
  formConfig: T3;
  formWorkflow: T4;
  formDataModel: T5;
  attachments: T6;
  formDynamics: T7;
  formRules?: T8;
  language: T9;
  formResources: T10;
  profile: T11;
  formValidations: T12;
}

export interface IRuntimeReducers extends IReducers<
  Reducer<ILayoutState>,
  Reducer<IFormDataState>,
  Reducer<IFormConfigState>,
  Reducer<IWorkflowState>,
  Reducer<IDataModelState>,
  Reducer<IAttachmentState>,
  Reducer<IFormDynamicState>,
  Reducer<IFormRuleState>,
  Reducer<ILanguageState>,
  Reducer<IResourceState>,
  Reducer<IProfileState>,
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
  attachments: AttachmentReducer,
  formDynamics: FormDynamics,
  formRules: FormRuleReducer,
  language: LanguageReducer,
  formResources: FormResourceReducer,
  profile: ProfileReducer,
  formValidations: ValidationReducer,
};

export default combineReducers(reducers);
