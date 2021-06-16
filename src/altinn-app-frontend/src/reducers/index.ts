/* eslint-disable import/no-cycle */
import { combineReducers,
  Reducer,
  ReducersMapObject } from 'redux';
import OptionsReducer, { IOptionsState } from '../shared/resources/options/optionsReducer';
import FormDataReducer, { IFormDataState } from '../features/form/data/formDataReducer';
import { IFormDynamicState } from '../features/form/dynamics';
import DataModelReducer, { IDataModelState } from '../features/form/datamodel/datamodelSlice';
import FormDynamicsReducer from '../features/form/dynamics/formDynamicsReducer';
import FormLayoutReducer, { ILayoutState } from '../features/form/layout/formLayoutSlice';
import FormRuleReducer, { IFormRuleState } from '../features/form/rules/rulesReducer';
import ValidationReducer, { IValidationState } from '../features/form/validation/validationSlice';
import InstantiationReducer, { IInstantiationState } from '../features/instantiate/instantiation/reducer';
import ApplicationMetadataReducer, { IApplicationMetadataState } from '../shared/resources/applicationMetadata/reducer';
import AttachmentReducer, { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import InstanceDataReducer, { IInstanceDataState } from '../shared/resources/instanceData/instanceDataReducers';
import LanguageReducer, { ILanguageState } from '../shared/resources/language/languageReducers';
import OrgsReducer, { IOrgsState } from '../shared/resources/orgs/orgsReducers';
import PartyReducer, { IPartyState } from '../shared/resources/party/partyReducers';
import processReducer, { IProcessState } from '../shared/resources/process/processReducer';
import ProfileReducer, { IProfileState } from '../shared/resources/profile/profileReducers';
import TextResourcesReducer, { ITextResourcesState } from '../shared/resources/textResources/textResourcesReducer';
import IsLoadingReducer, { IIsLoadingState } from '../shared/resources/isLoading/isLoadingSlice';
import QueueReducer, { IQueueState } from '../shared/resources/queue/queueSlice';

export interface IReducers<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19> {
  formLayout: T1;
  formData: T2;
  formDataModel: T3;
  attachments: T4;
  formDynamics: T5;
  formRules?: T6;
  language: T7;
  textResources: T8;
  profile: T9;
  formValidations: T10;
  party: T11;
  applicationMetadata: T12;
  instantiation: T13;
  organisationMetaData: T14;
  instanceData: T15;
  process: T16;
  isLoading: T17;
  queue: T18;
  optionState: T19
}

export interface IRuntimeReducers extends IReducers<
  Reducer<ILayoutState>,
  Reducer<IFormDataState>,
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
  Reducer<IProcessState>,
  Reducer<IIsLoadingState>,
  Reducer<IQueueState>,
  Reducer<IOptionsState>
  >,
  ReducersMapObject {
}

const reducers: IRuntimeReducers = {
  applicationMetadata: ApplicationMetadataReducer,
  attachments: AttachmentReducer,
  formData: FormDataReducer,
  formDataModel: DataModelReducer,
  formDynamics: FormDynamicsReducer,
  formLayout: FormLayoutReducer,
  formRules: FormRuleReducer,
  formValidations: ValidationReducer,
  instanceData: InstanceDataReducer,
  instantiation: InstantiationReducer,
  isLoading: IsLoadingReducer,
  language: LanguageReducer,
  organisationMetaData: OrgsReducer,
  party: PartyReducer,
  process: processReducer,
  profile: ProfileReducer,
  queue: QueueReducer,
  textResources: TextResourcesReducer,
  optionState: OptionsReducer,
};

export default combineReducers(reducers);
