import { useCallback } from 'react';

import deepEqual from 'fast-deep-equal';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { mapBackendIssuesToFieldValidations } from 'src/features/validation/backendValidation/backendValidationUtils';
import { Validation } from 'src/features/validation/validationContext';
import type { BackendValidationIssueGroups } from 'src/features/validation';

/**
 * Hook for updating incremental validations from various sources (usually the validations updated from last saved data)
 */
export function useUpdateIncrementalValidations(setInFormData = true) {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const defaultDataElementId = DataModels.useDefaultDataElementId();
  const getBackendValidatorGroups = Validation.useGetBackendValidatorGroups();
  const updateInFormData = FD.useSetLastValidationIssues();

  return useCallback(
    (lastSaveValidations: BackendValidationIssueGroups) => {
      // Validators that did not run on this save are not in lastSaveValidations, and keep their validations
      const previousValidatorGroups = getBackendValidatorGroups();

      const newValidatorGroups = structuredClone(previousValidatorGroups);
      for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
        newValidatorGroups[group] = mapBackendIssuesToFieldValidations(validationIssues, defaultDataElementId);
      }

      if (setInFormData) {
        updateInFormData(lastSaveValidations);
      }

      if (deepEqual(previousValidatorGroups, newValidatorGroups)) {
        // Don't update any validations, only set last saved validations
        updateBackendValidations(undefined, { incremental: lastSaveValidations });
        return;
      }

      updateBackendValidations(newValidatorGroups, { incremental: lastSaveValidations });
    },
    [defaultDataElementId, getBackendValidatorGroups, updateBackendValidations, setInFormData, updateInFormData],
  );
}
