import { useEffect } from 'react';

import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import {
  useBackendValidationQuery,
  useUpdateInitialValidations,
} from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToTaskValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
  useShouldValidateInitial,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import { Validation } from 'src/features/validation/validationContext';
import type { BackendValidationIssue } from 'src/features/validation';

const emptyArray: BackendValidationIssue[] = [];

export function BackendValidation() {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const defaultDataElementId = FormBootstrap.useDefaultDataElementId();
  const taskLevelBootstrapIssues = FormBootstrap.useInitialValidationIssues() ?? emptyArray;
  const bootstrapDataModels = FormBootstrap.useDataModels();
  const updateInitialValidations = useUpdateInitialValidations();
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const enabled = useShouldValidateInitial();
  const { data: queriedInitialValidations, isFetching: isFetchingInitial } = useBackendValidationQuery({
    enabled: false,
  });
  const updateIncrementalValidations = useUpdateIncrementalValidations(false);

  // Initial validation
  useEffect(() => {
    // Ensure each issue has dataElementId set from its data model.
    // This is critical for incremental updates to correctly match and replace issues.
    const initialFieldIssues = Object.values(bootstrapDataModels).flatMap((dataModel) =>
      (dataModel.initialValidationIssues ?? []).map((issue) => ({
        ...issue,
        dataElementId: issue.dataElementId ?? dataModel.dataElementId ?? undefined,
      })),
    );
    const initialValidations = [...taskLevelBootstrapIssues, ...initialFieldIssues];

    const initialTaskValidations = mapBackendIssuesToTaskValidations(taskLevelBootstrapIssues);
    const initialValidatorGroups = Object.values(bootstrapDataModels).reduce(
      (acc, dataModel) => {
        const groups = mapBackendValidationsToValidatorGroups(
          dataModel.initialValidationIssues ?? undefined,
          dataModel.dataElementId,
        );
        for (const [source, issues] of Object.entries(groups)) {
          if (!acc[source]) {
            acc[source] = [];
          }
          acc[source].push(...issues);
        }
        return acc;
      },
      {} as ReturnType<typeof mapBackendValidationsToValidatorGroups>,
    );

    const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups);
    updateInitialValidations(initialValidations);
    updateBackendValidations(backendValidations, { initial: initialValidations }, initialTaskValidations);
  }, [bootstrapDataModels, taskLevelBootstrapIssues, updateBackendValidations, updateInitialValidations]);

  // Keep initial validations in sync with /validate query results (main-like behavior).
  // This ensures manual refetches (used by subform validation flow) are reflected in state.
  useEffect(() => {
    if (!enabled || isFetchingInitial) {
      return;
    }

    const initialTaskValidations = mapBackendIssuesToTaskValidations(queriedInitialValidations);
    const initialValidatorGroups = mapBackendValidationsToValidatorGroups(
      queriedInitialValidations,
      defaultDataElementId,
    );
    const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups);
    updateBackendValidations(backendValidations, { initial: queriedInitialValidations }, initialTaskValidations);
  }, [defaultDataElementId, queriedInitialValidations, enabled, isFetchingInitial, updateBackendValidations]);

  // Incremental validation: Update validators and propagate changes to validation context
  useEffect(() => {
    if (lastSaveValidations) {
      updateIncrementalValidations(lastSaveValidations);
    }
  }, [lastSaveValidations, updateIncrementalValidations]);

  return null;
}
