import { useCallback } from 'react';

import deepEqual from 'fast-deep-equal';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useGetCachedInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToFieldValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { Validation } from 'src/features/validation/validationContext';
import type { BackendValidationIssueGroups } from 'src/features/validation';

/**
 * Hook for updating incremental validations from various sources (usually the validations updated from last saved data)
 */
export function useUpdateIncrementalValidations(setInFormData = true) {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const defaultDataElementId = DataModels.useDefaultDataElementId();
  const getCachedInitialValidations = useGetCachedInitialValidations();
  const updateInFormData = FD.useSetLastValidationIssues();

  return useCallback(
    (lastSaveValidations: BackendValidationIssueGroups) => {
      const { cachedInitialValidations } = getCachedInitialValidations();
      const initialValidatorGroups = mapBackendValidationsToValidatorGroups(
        cachedInitialValidations,
        defaultDataElementId,
      );

      const newValidatorGroups = structuredClone(initialValidatorGroups);
      for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
        newValidatorGroups[group] = mapBackendIssuesToFieldValidations(validationIssues, defaultDataElementId);
      }

      if (setInFormData) {
        updateInFormData(lastSaveValidations);
      }

      if (deepEqual(initialValidatorGroups, newValidatorGroups)) {
        // Don't update any validations, only set last saved validations
        updateBackendValidations(undefined, { incremental: lastSaveValidations });
        return;
      }

      const backendValidations = mapValidatorGroupsToDataModelValidations(newValidatorGroups);
      updateBackendValidations(backendValidations, { incremental: lastSaveValidations });
    },
    [defaultDataElementId, getCachedInitialValidations, updateBackendValidations, setInFormData, updateInFormData],
  );
}
