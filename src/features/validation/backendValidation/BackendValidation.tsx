import { useEffect, useMemo, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import {
  type BackendFieldValidatorGroups,
  type BuiltInValidationIssueSources,
  IgnoredValidators,
} from 'src/features/validation';
import {
  mapBackendIssuesToFieldValdiations,
  mapValidatorGroupsToDataModelValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { Validation } from 'src/features/validation/validationContext';

export function BackendValidation({ dataTypes }: { dataTypes: string[] }) {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const getDataTypeForElementId = DataModels.useGetDataTypeForDataElementId();
  const lastSaveValidations = FD.useLastSaveValidationIssues();

  // Map initial validations
  const initialValidations = DataModels.useInitialValidations();
  const initialValidatorGroups: BackendFieldValidatorGroups = useMemo(() => {
    if (!initialValidations) {
      return {};
    }
    // Note that we completely ignore task validations (validations not related to form data) on initial validations,
    // this is because validations like minimum number of attachments in application metadata is not really useful to show initially
    const fieldValidations = mapBackendIssuesToFieldValdiations(initialValidations, getDataTypeForElementId);
    const validatorGroups: BackendFieldValidatorGroups = {};
    for (const validation of fieldValidations) {
      // Do not include ignored ignored validators in initial validations
      if (IgnoredValidators.includes(validation.source as BuiltInValidationIssueSources)) {
        continue;
      }

      if (!validatorGroups[validation.source]) {
        validatorGroups[validation.source] = [];
      }
      validatorGroups[validation.source].push(validation);
    }
    return validatorGroups;
  }, [getDataTypeForElementId, initialValidations]);

  // Initial validation
  useEffect(() => {
    const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups, dataTypes);
    updateBackendValidations(backendValidations, initialValidatorGroups);
  }, [dataTypes, initialValidatorGroups, updateBackendValidations]);

  const validatorGroups = useRef<BackendFieldValidatorGroups>(initialValidatorGroups);

  // Incremental validation: Update validators and propagate changes to validationcontext
  useEffect(() => {
    if (lastSaveValidations) {
      const newValidatorGroups = structuredClone(validatorGroups.current);

      for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
        newValidatorGroups[group] = mapBackendIssuesToFieldValdiations(validationIssues, getDataTypeForElementId);
      }

      if (deepEqual(validatorGroups.current, newValidatorGroups)) {
        // Dont update any validations, only set last saved validations
        updateBackendValidations(undefined, lastSaveValidations);
        return;
      }

      validatorGroups.current = newValidatorGroups;
      const backendValidations = mapValidatorGroupsToDataModelValidations(validatorGroups.current, dataTypes);
      updateBackendValidations(backendValidations, lastSaveValidations);
    }
  }, [dataTypes, getDataTypeForElementId, lastSaveValidations, updateBackendValidations]);

  return null;
}
