import { useCallback } from 'react';

import deepEqual from 'fast-deep-equal';

import { useGetCachedInitialValidations } from 'src/core/queries/backendValidation';
import { FormStore } from 'src/features/form/FormContext';
import {
  mapBackendIssuesToComponentValidations,
  mapBackendIssuesToFieldValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { BackendValidationIssue, BackendValidationIssueGroups } from 'src/features/validation';

/**
 * Hook for updating incremental validations from various sources (usually the validations updated from last saved data)
 */
export function useUpdateIncrementalValidations() {
  const updateBackendValidations = FormStore.validation.useUpdateBackendValidations();
  const getCachedInitialValidations = useGetCachedInitialValidations();

  return useCallback(
    (lastSaveValidations: BackendValidationIssueGroups) => {
      updateIncrementalValidations(
        lastSaveValidations,
        getCachedInitialValidations().cachedInitialValidations,
        updateBackendValidations,
      );
    },
    [getCachedInitialValidations, updateBackendValidations],
  );
}

export function updateIncrementalValidations(
  lastSaveValidations: BackendValidationIssueGroups,
  cachedInitialValidations: BackendValidationIssue[] | undefined,
  updateBackendValidations: FormStoreState['validation']['updateBackendValidations'],
) {
  const initialValidatorGroups = mapBackendValidationsToValidatorGroups(cachedInitialValidations);

  const newValidatorGroups = structuredClone(initialValidatorGroups);
  for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
    newValidatorGroups[group] = mapBackendIssuesToFieldValidations(validationIssues);
  }

  // Validations linked to a component without a field are not part of the validator groups, so they are merged
  // the same way here: issues from validators that ran on save replace those from the initial validation
  const componentValidations = mapBackendIssuesToComponentValidations([
    ...(cachedInitialValidations ?? []).filter((issue) => !(issue.source in lastSaveValidations)),
    ...Object.values(lastSaveValidations).flat(),
  ]);

  if (deepEqual(initialValidatorGroups, newValidatorGroups)) {
    // Don't update any field validations, only set last saved validations
    updateBackendValidations(undefined, { incremental: lastSaveValidations }, undefined, componentValidations);
    return;
  }

  const backendValidations = mapValidatorGroupsToDataModelValidations(newValidatorGroups);
  updateBackendValidations(backendValidations, { incremental: lastSaveValidations }, undefined, componentValidations);
}
