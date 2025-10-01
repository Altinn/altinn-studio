import { useEffect, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useBackendValidationQuery } from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToFieldValidations,
  mapBackendIssuesToTaskValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
  useShouldValidateInitial,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { Validation } from 'src/features/validation/validationContext';
import type { BackendFieldValidatorGroups } from 'src/features/validation';

export function BackendValidation() {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const defaultDataElementId = DataModels.useDefaultDataElementId();
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const validatorGroups = useRef<BackendFieldValidatorGroups>({});
  const enabled = useShouldValidateInitial();
  const { data: initialValidations, isFetching } = useBackendValidationQuery({ enabled });
  const initialValidatorGroups: BackendFieldValidatorGroups = mapBackendValidationsToValidatorGroups(
    initialValidations,
    defaultDataElementId,
  );

  // Map task validations
  const initialTaskValidations = mapBackendIssuesToTaskValidations(initialValidations);

  // Initial validation
  useEffect(() => {
    if (!isFetching) {
      validatorGroups.current = initialValidatorGroups;
      const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups);
      updateBackendValidations(backendValidations, { initial: initialValidations }, initialTaskValidations);
    }
  }, [initialTaskValidations, initialValidations, initialValidatorGroups, isFetching, updateBackendValidations]);

  // Incremental validation: Update validators and propagate changes to validationcontext
  useEffect(() => {
    if (lastSaveValidations) {
      const newValidatorGroups = structuredClone(validatorGroups.current);

      for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
        newValidatorGroups[group] = mapBackendIssuesToFieldValidations(validationIssues, defaultDataElementId);
      }

      if (deepEqual(validatorGroups.current, newValidatorGroups)) {
        // Dont update any validations, only set last saved validations
        updateBackendValidations(undefined, { incremental: lastSaveValidations });
        return;
      }

      validatorGroups.current = newValidatorGroups;
      const backendValidations = mapValidatorGroupsToDataModelValidations(validatorGroups.current);
      updateBackendValidations(backendValidations, { incremental: lastSaveValidations });
    }
  }, [defaultDataElementId, lastSaveValidations, updateBackendValidations]);

  return null;
}
