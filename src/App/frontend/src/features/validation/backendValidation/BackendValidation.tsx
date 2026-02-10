import { useEffect } from 'react';

import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useUpdateInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToTaskValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import { Validation } from 'src/features/validation/validationContext';
import type { BackendValidationIssue } from 'src/features/validation';

const emptyArray: BackendValidationIssue[] = [];

export function BackendValidation() {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const taskLevelBootstrapIssues = FormBootstrap.useInitialValidationIssues() ?? emptyArray;
  const bootstrapDataModels = FormBootstrap.useDataModels();
  const updateInitialValidations = useUpdateInitialValidations();
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const updateIncrementalValidations = useUpdateIncrementalValidations(false);

  // Initial validation
  useEffect(() => {
    const initialFieldIssues = Object.values(bootstrapDataModels).flatMap(
      (dataModel) => dataModel.initialValidationIssues ?? [],
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

  // Incremental validation: Update validators and propagate changes to validation context
  useEffect(() => {
    if (lastSaveValidations) {
      updateIncrementalValidations(lastSaveValidations);
    }
  }, [lastSaveValidations, updateIncrementalValidations]);

  return null;
}
