/* eslint-disable import/no-cycle */
import { combineReducers } from 'redux';
import OptionsReducer from '../shared/resources/options/optionsReducer';
import FormDataReducer from '../features/form/data/formDataReducer';
import DataModelReducer from '../features/form/datamodel/datamodelSlice';
import FormDynamicsReducer from '../features/form/dynamics/formDynamicsReducer';
import FormLayoutReducer from '../features/form/layout/formLayoutSlice';
import FormRuleReducer from '../features/form/rules/rulesReducer';
import ValidationReducer from '../features/form/validation/validationSlice';
import InstantiationReducer from '../features/instantiate/instantiation/reducer';
import ApplicationMetadataReducer from '../shared/resources/applicationMetadata/reducer';
import ApplicationSettingsReducer, { IApplicationSettingsState } from '../shared/resources/applicationSettings/applicationSettingsSlice';
import AttachmentReducer from '../shared/resources/attachments/attachmentReducer';
import InstanceDataReducer from '../shared/resources/instanceData/instanceDataReducers';
import LanguageReducer from '../shared/resources/language/languageReducers';
import OrgsReducer from '../shared/resources/orgs/orgsReducers';
import PartyReducer from '../shared/resources/party/partyReducers';
import processReducer from '../shared/resources/process/processReducer';
import ProfileReducer from '../shared/resources/profile/profileReducers';
import TextResourcesReducer from '../shared/resources/textResources/textResourcesReducer';
import IsLoadingReducer from '../shared/resources/isLoading/isLoadingSlice';
import QueueReducer from '../shared/resources/queue/queueSlice';
import { appApi } from 'src/services/AppApi';

const reducers = {
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
  applicationSettings: ApplicationSettingsReducer,
  [appApi.reducerPath]: appApi.reducer,
};

export default combineReducers(reducers);
