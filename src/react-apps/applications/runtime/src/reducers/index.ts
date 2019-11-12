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
import InstantiationReducer, { IInstantiationState } from '../features/instantiate/instantiation/reducer';
import ApplicationMetadataReducer, { IApplicationMetadataState } from '../shared/resources/applicationMetadata/reducer';
import AttachmentReducer, { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import InstanceDataReducer, { IInstanceDataState } from '../shared/resources/instanceData/instanceDataReducers';
import LanguageReducer, { ILanguageState } from '../shared/resources/language/languageReducers';
import OrgsReducer, { IOrgsState } from '../shared/resources/orgs/orgsReducers';
import PartyReducer, { IPartyState } from '../shared/resources/party/partyReducers';
import processReducer, { IProcessState } from '../shared/resources/process/processReducer';
import ProfileReducer, { IProfileState } from '../shared/resources/profile/profileReducers';
import TextResourcesReducer, { ITextResourcesState } from '../shared/resources/textResources/reducer';

export interface IReducers<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17> {
  formLayout: T1;
  formData: T2;
  formConfig: T3;
  formDataModel: T4;
  attachments: T5;
  formDynamics: T6;
  formRules?: T7;
  language: T8;
  textResources: T9;
  profile: T10;
  formValidations: T11;
  party: T12;
  applicationMetadata: T13;
  instantiation: T14;
  organisationMetaData: T15;
  instanceData: T16;
  process: T17;
}

export interface IRuntimeReducers extends IReducers<
  Reducer<ILayoutState>,
  Reducer<IFormDataState>,
  Reducer<IFormConfigState>,
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
  Reducer<IInstanceDataState>,
  Reducer<IProcessState>
  >,
  ReducersMapObject {
}

const reducers: IRuntimeReducers = {
  formLayout: FormLayoutReducer,
  formData: FormDataReducer,
  formConfig: FormConfigState,
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
  organisationMetaData: OrgsReducer,
  instanceData: InstanceDataReducer,
  process: processReducer,
};

export default combineReducers(reducers);
