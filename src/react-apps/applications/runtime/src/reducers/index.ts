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
import FormRuleReducer, { IFormRuleState } from '../features/form/rules/reducer';
import ValidationReducer, { IValidationState } from '../features/form/validation/reducer';
import FormWorkflowReducer, { IWorkflowState } from '../features/form/workflow/reducer';
import InstantiationReducer, { IInstantiationState } from '../features/instantiate/instantiation/reducer';
import ApplicationMetadataReducer, { IApplicationMetadataState } from '../shared/resources/applicationMetadata/reducer';
import AttachmentReducer, { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import InstanceDataReducer, { IInstanceDataState } from '../shared/resources/instanceData/instanceDataReducers';
import LanguageReducer, { ILanguageState } from '../shared/resources/language/languageReducers';
import OrgsReducer, { IOrgsState } from '../shared/resources/orgs/orgsReducers';
import PartyReducer, { IPartyState } from '../shared/resources/party/partyReducers';
import ProfileReducer, { IProfileState } from '../shared/resources/profile/profileReducers';
import TextResourcesReducer, { ITextResourcesState } from '../shared/resources/textResources/reducer';

export interface IReducers<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17> {
  formLayout: T1;
  formData: T2;
  formConfig: T3;
  formWorkflow: T4;
  formDataModel: T5;
  attachments: T6;
  formDynamics: T7;
  formRules?: T8;
  language: T9;
  textResources: T10;
  profile: T11;
  formValidations: T12;
  party: T13;
  applicationMetadata: T14;
  instantiation: T15;
  organizationMetaData: T16;
  instanceData: T17;
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
  Reducer<ITextResourcesState>,
  Reducer<IProfileState>,
  Reducer<IValidationState>,
  Reducer<IPartyState>,
  Reducer<IApplicationMetadataState>,
  Reducer<IInstantiationState>,
  Reducer<IOrgsState>,
  Reducer<IInstanceDataState>
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
  textResources: TextResourcesReducer,
  profile: ProfileReducer,
  formValidations: ValidationReducer,
  party: PartyReducer,
  applicationMetadata: ApplicationMetadataReducer,
  instantiation: InstantiationReducer,
  organizationMetaData: OrgsReducer,
  instanceData: InstanceDataReducer,
};

export default combineReducers(reducers);
