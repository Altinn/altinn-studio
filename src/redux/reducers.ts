import { combineReducers } from 'redux';

import { applicationMetadataSlice } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { applicationSettingsSlice } from 'src/features/applicationSettings/applicationSettingsSlice';
import { customValidationSlice } from 'src/features/customValidation/customValidationSlice';
import { formDataModelSlice } from 'src/features/datamodel/datamodelSlice';
import { devToolsSlice } from 'src/features/devtools/data/devToolsSlice';
import { footerLayoutSlice } from 'src/features/footer/data/footerLayoutSlice';
import { formDynamicsSlice } from 'src/features/form/dynamics/formDynamicsSlice';
import { formLayoutSlice } from 'src/features/form/layout/formLayoutSlice';
import { formRulesSlice } from 'src/features/form/rules/rulesSlice';
import { formDataSlice } from 'src/features/formData/formDataSlice';
import { textResourcesSlice } from 'src/features/language/textResources/textResourcesSlice';
import { orgsSlice } from 'src/features/orgs/orgsSlice';
import { profileSlice } from 'src/features/profile/profileSlice';
import { validationSlice } from 'src/features/validation/validationSlice';
import { deprecatedSlice } from 'src/redux/deprecatedSlice';
import { resetRootSagas } from 'src/redux/sagaSlice';
import type { SliceReducers } from 'src/redux/sagaSlice';

const slices = [
  applicationMetadataSlice,
  applicationSettingsSlice,
  customValidationSlice,
  devToolsSlice,
  footerLayoutSlice,
  formDataModelSlice,
  formDataSlice,
  formDynamicsSlice,
  formLayoutSlice,
  formRulesSlice,
  orgsSlice,
  profileSlice,
  textResourcesSlice,
  validationSlice,
  deprecatedSlice,
];

type ReturnTypes<T extends Array<() => unknown>> = {
  [K in keyof T]: ReturnType<T[K]>;
};

type Whatever = SliceReducers<ReturnTypes<typeof slices>>;

const reducers = () => {
  resetRootSagas();

  const out = {};
  for (const slice of slices) {
    const result = slice();
    out[result.name] = result.reducer;
  }

  return out as typeof out & Whatever;
};

export const combinedReducers = () => combineReducers(reducers());
