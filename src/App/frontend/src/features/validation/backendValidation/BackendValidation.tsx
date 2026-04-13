import { useEffect } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useBackendValidationQuery } from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToTaskValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';

export function BackendValidation() {
  const updateBackendValidations = FormStore.validation.useUpdateBackendValidations();
  const { data: queriedInitialValidations } = useBackendValidationQuery({ enabled: false });

  // This ensures manual refetches (used by subform validation, clicking on a submit button) are reflected in state.
  useEffect(() => {
    if (queriedInitialValidations) {
      const initialTaskValidations = mapBackendIssuesToTaskValidations(queriedInitialValidations);
      const initialValidatorGroups = mapBackendValidationsToValidatorGroups(queriedInitialValidations);
      const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups);
      updateBackendValidations(backendValidations, { initial: queriedInitialValidations }, initialTaskValidations);
    }
  }, [queriedInitialValidations, updateBackendValidations]);

  return null;
}
