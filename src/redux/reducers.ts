import { combineReducers } from 'redux';

import { applicationMetadataSlice } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { applicationSettingsSlice } from 'src/features/applicationSettings/applicationSettingsSlice';
import { attachmentSlice } from 'src/features/attachments/attachmentSlice';
import { customValidationSlice } from 'src/features/customValidation/customValidationSlice';
import { dataListsSlice } from 'src/features/dataLists/dataListsSlice';
import { formDataModelSlice } from 'src/features/datamodel/datamodelSlice';
import { devToolsSlice } from 'src/features/devtools/data/devToolsSlice';
import { formDynamicsSlice } from 'src/features/dynamics/formDynamicsSlice';
import { footerLayoutSlice } from 'src/features/footer/data/footerLayoutSlice';
import { formDataSlice } from 'src/features/formData/formDataSlice';
import { formRulesSlice } from 'src/features/formRules/rulesSlice';
import { instanceDataSlice } from 'src/features/instanceData/instanceDataSlice';
import { instantiationSlice } from 'src/features/instantiate/instantiation/instantiationSlice';
import { isLoadingSlice } from 'src/features/isLoading/isLoadingSlice';
import { formLayoutSlice } from 'src/features/layout/formLayoutSlice';
import { optionsSlice } from 'src/features/options/optionsSlice';
import { orgsSlice } from 'src/features/orgs/orgsSlice';
import { partySlice } from 'src/features/party/partySlice';
import { processSlice } from 'src/features/process/processSlice';
import { profileSlice } from 'src/features/profile/profileSlice';
import { queueSlice } from 'src/features/queue/queueSlice';
import { textResourcesSlice } from 'src/features/textResources/textResourcesSlice';
import { validationSlice } from 'src/features/validation/validationSlice';
import { resetRootSagas } from 'src/redux/sagaSlice';
import { appApi } from 'src/services/AppApi';
import type { SliceReducers } from 'src/redux/sagaSlice';

const slices = [
  applicationMetadataSlice,
  applicationSettingsSlice,
  attachmentSlice,
  customValidationSlice,
  dataListsSlice,
  devToolsSlice,
  footerLayoutSlice,
  formDataModelSlice,
  formDataSlice,
  formDynamicsSlice,
  formLayoutSlice,
  formRulesSlice,
  instanceDataSlice,
  instantiationSlice,
  isLoadingSlice,
  optionsSlice,
  orgsSlice,
  partySlice,
  processSlice,
  profileSlice,
  queueSlice,
  textResourcesSlice,
  validationSlice,
];

type ReturnTypes<T extends Array<() => unknown>> = {
  [K in keyof T]: ReturnType<T[K]>;
};

type Whatever = SliceReducers<ReturnTypes<typeof slices>>;

const reducers = () => {
  resetRootSagas();

  const out = {
    [appApi.reducerPath]: appApi.reducer,
  };

  for (const slice of slices) {
    const result = slice();
    out[result.name] = result.reducer;
  }

  return out as typeof out & Whatever;
};

export const combinedReducers = () => combineReducers(reducers());
