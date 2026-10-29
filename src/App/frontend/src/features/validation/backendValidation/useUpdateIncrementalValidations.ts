import { useCallback } from 'react';

import deepEqual from 'fast-deep-equal';

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
  const formStore = FormStore.raw.useStore();

  return useCallback(
    (lastSaveValidations: BackendValidationIssueGroups) => {
      updateIncrementalValidations(
        lastSaveValidations,
        formStore.getState().validation.backendIssues,
        updateBackendValidations,
      );
    },
    [formStore, updateBackendValidations],
  );
}

export function updateIncrementalValidations(
  lastSaveValidations: BackendValidationIssueGroups,
  previousBackendIssues: BackendValidationIssue[],
  updateBackendValidations: FormStoreState['validation']['updateBackendValidations'],
) {
  // Validators that did not run on save are not in lastSaveValidations, and keep their issues
  const backendIssues = [
    ...previousBackendIssues.filter((issue) => !(issue.source in lastSaveValidations)),
    ...Object.values(lastSaveValidations).flat(),
  ];

  const previousValidatorGroups = mapBackendValidationsToValidatorGroups(previousBackendIssues);

  const newValidatorGroups = structuredClone(previousValidatorGroups);
  for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
    newValidatorGroups[group] = mapBackendIssuesToFieldValidations(validationIssues);
  }

  // Validations linked to a component without a field are not part of the validator groups
  const componentValidations = mapBackendIssuesToComponentValidations(backendIssues);

  if (deepEqual(previousValidatorGroups, newValidatorGroups)) {
    // Don't update any field validations, only set last saved validations
    updateBackendValidations(
      undefined,
      { incremental: lastSaveValidations },
      undefined,
      componentValidations,
      backendIssues,
    );
    return;
  }

  const backendValidations = mapValidatorGroupsToDataModelValidations(newValidatorGroups);
  updateBackendValidations(
    backendValidations,
    { incremental: lastSaveValidations },
    undefined,
    componentValidations,
    backendIssues,
  );
}
