import { combineReducers } from 'redux';
import optionsSlice from '../shared/resources/options/optionsSlice';
import formDataSlice from '../features/form/data/formDataSlice';
import formRulesSlice from 'src/features/form/rules/rulesSlice';
import instantiationSlice from 'src/features/instantiate/instantiation/instantiationSlice';
import applicationMetadataSlice from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import attachmentSlice from 'src/shared/resources/attachments/attachmentSlice';
import instanceDataSlice from 'src/shared/resources/instanceData/instanceDataSlice';
import orgsSlice from 'src/shared/resources/orgs/orgsSlice';
import partySlice from '../shared/resources/party/partySlice';
import processSlice from 'src/shared/resources/process/processSlice';
import profileSlice from 'src/shared/resources/profile/profileSlice';
import textResourcesSlice from '../shared/resources/textResources/textResourcesSlice';
import { appApi } from 'src/services/AppApi';
import formDynamicsSlice from '../features/form/dynamics/formDynamicsSlice';
import formLayoutSlice from '../features/form/layout/formLayoutSlice';
import formDataModelSlice from '../features/form/datamodel/datamodelSlice';
import validationSlice from '../features/form/validation/validationSlice';
import isLoadingSlice from '../shared/resources/isLoading/isLoadingSlice';
import languageSlice from '../shared/resources/language/languageSlice';
import queueSlice from '../shared/resources/queue/queueSlice';
import applicationSettingsSlice from '../shared/resources/applicationSettings/applicationSettingsSlice';

const reducers = {
  [applicationMetadataSlice.name]: applicationMetadataSlice.reducer,
  [attachmentSlice.name]: attachmentSlice.reducer,
  [formDataSlice.name]: formDataSlice.reducer,
  [formDataModelSlice.name]: formDataModelSlice.reducer,
  [formDynamicsSlice.name]: formDynamicsSlice.reducer,
  [formLayoutSlice.name]: formLayoutSlice.reducer,
  [formRulesSlice.name]: formRulesSlice.reducer,
  [validationSlice.name]: validationSlice.reducer,
  [instanceDataSlice.name]: instanceDataSlice.reducer,
  [instantiationSlice.name]: instantiationSlice.reducer,
  [isLoadingSlice.name]: isLoadingSlice.reducer,
  [languageSlice.name]: languageSlice.reducer,
  [orgsSlice.name]: orgsSlice.reducer,
  [partySlice.name]: partySlice.reducer,
  [processSlice.name]: processSlice.reducer,
  [profileSlice.name]: profileSlice.reducer,
  [queueSlice.name]: queueSlice.reducer,
  [textResourcesSlice.name]: textResourcesSlice.reducer,
  [optionsSlice.name]: optionsSlice.reducer,
  [applicationSettingsSlice.name]: applicationSettingsSlice.reducer,
  [appApi.reducerPath]: appApi.reducer,
};

export default combineReducers(reducers);
