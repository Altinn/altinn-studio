import { combineReducers } from 'redux';

import { footerLayoutSlice } from 'src/features/footer/data/footerLayoutSlice';
import { formDataSlice } from 'src/features/form/data/formDataSlice';
import { formDataModelSlice } from 'src/features/form/datamodel/datamodelSlice';
import { formDynamicsSlice } from 'src/features/form/dynamics/formDynamicsSlice';
import { formLayoutSlice } from 'src/features/form/layout/formLayoutSlice';
import { formRulesSlice } from 'src/features/form/rules/rulesSlice';
import { validationSlice } from 'src/features/form/validation/validationSlice';
import { instantiationSlice } from 'src/features/instantiate/instantiation/instantiationSlice';
import { appApi } from 'src/services/AppApi';
import { applicationMetadataSlice } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { applicationSettingsSlice } from 'src/shared/resources/applicationSettings/applicationSettingsSlice';
import { attachmentSlice } from 'src/shared/resources/attachments/attachmentSlice';
import { dataListsSlice } from 'src/shared/resources/dataLists/dataListsSlice';
import { instanceDataSlice } from 'src/shared/resources/instanceData/instanceDataSlice';
import { isLoadingSlice } from 'src/shared/resources/isLoading/isLoadingSlice';
import { languageSlice } from 'src/shared/resources/language/languageSlice';
import { optionsSlice } from 'src/shared/resources/options/optionsSlice';
import { orgsSlice } from 'src/shared/resources/orgs/orgsSlice';
import { partySlice } from 'src/shared/resources/party/partySlice';
import { processSlice } from 'src/shared/resources/process/processSlice';
import { profileSlice } from 'src/shared/resources/profile/profileSlice';
import { queueSlice } from 'src/shared/resources/queue/queueSlice';
import { textResourcesSlice } from 'src/shared/resources/textResources/textResourcesSlice';

const reducers = {
  [applicationMetadataSlice.name]: applicationMetadataSlice.reducer,
  [attachmentSlice.name]: attachmentSlice.reducer,
  [formDataSlice.name]: formDataSlice.reducer,
  [formDataModelSlice.name]: formDataModelSlice.reducer,
  [formDynamicsSlice.name]: formDynamicsSlice.reducer,
  [formLayoutSlice.name]: formLayoutSlice.reducer,
  [formRulesSlice.name]: formRulesSlice.reducer,
  [footerLayoutSlice.name]: footerLayoutSlice.reducer,
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
  [dataListsSlice.name]: dataListsSlice.reducer,
  [applicationSettingsSlice.name]: applicationSettingsSlice.reducer,
  [appApi.reducerPath]: appApi.reducer,
};

export const combinedReducers = combineReducers(reducers);
