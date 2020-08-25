/* eslint-disable import/no-cycle */
import { combineReducers,
  Reducer,
  ReducersMapObject } from 'redux';
import OptionsReducer, { IOptionsState } from '../resources/options/optionsReducer';
import FormDataReducer, { IFormDataState } from '../features/form/data/formDataReducer';
import FormDataModel, { IDataModelState } from '../features/form/datamodel/formDatamodelReducer';
import ValidationReducer, { IValidationState } from '../features/form/validation/validationReducer';
import InstantiationReducer, { IInstantiationState } from '../features/instantiate/instantiation/reducer';
import ApplicationMetadataReducer, { IApplicationMetadataState } from '../resources/applicationMetadata/reducer';
import AttachmentReducer, { IAttachmentState } from '../resources/attachments/attachmentReducer';
import InstanceDataReducer, { IInstanceDataState } from '../resources/instanceData/instanceDataReducers';
import LanguageReducer, { ILanguageState } from '../resources/language/languageReducers';
import OrgsReducer, { IOrgsState } from '../resources/orgs/orgsReducers';
import PartyReducer, { IPartyState } from '../resources/party/partyReducers';
import processReducer, { IProcessState } from '../resources/process/processReducer';
import ProfileReducer, { IProfileState } from '../resources/profile/profileReducers';
import TextResourcesReducer, { ITextResourcesState } from '../resources/textResources/textResourcesReducer';
import IsLoadingReducer, { IIsLoadingState } from '../resources/isLoading/isLoadingReducers';
import QueueReducer, { IQueueState } from '../resources/queue/queueReducer';

export interface IReducers<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16> {
  formData: T1;
  formDataModel: T2;
  attachments: T3;
  language: T4;
  textResources: T5;
  profile: T6;
  formValidations: T7;
  party: T8;
  applicationMetadata: T9;
  instantiation: T10;
  organisationMetaData: T11;
  instanceData: T12;
  process: T13;
  isLoading: T14;
  queue: T15;
  optionState: T16
}

export interface IRuntimeReducers extends IReducers<
  Reducer<IFormDataState>,
  Reducer<IDataModelState>,
  Reducer<IAttachmentState>,
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
  formDataModel: FormDataModel,
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
