import { useEffect, useMemo, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { type BackendFieldValidatorGroups } from 'src/features/validation';
import { useBackendValidationQuery } from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToFieldValidations,
  mapBackendIssuesToTaskValidations,
  mapValidatorGroupsToDataModelValidations,
  useShouldValidateInitial,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { Validation } from 'src/features/validation/validationContext';

const emptyObject = {};
const emptyArray = [];

export function BackendValidation({ dataTypes }: { dataTypes: string[] }) {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const defaultDataElementId = DataModels.useDefaultDataElementId();
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const validatorGroups = useRef<BackendFieldValidatorGroups>({});

  // Map initial validations
  const enabled = useShouldValidateInitial();
  const { data: initialValidations, isFetching } = useBackendValidationQuery({ enabled });
  const initialValidatorGroups: BackendFieldValidatorGroups = useMemo(() => {
    if (!initialValidations) {
      return emptyObject;
    }
    // Note that we completely ignore task validations (validations not related to form data) on initial validations,
    // this is because validations like minimum number of attachments in application metadata is not really useful to show initially
    const fieldValidations = mapBackendIssuesToFieldValidations(initialValidations, defaultDataElementId);
    const validatorGroups: BackendFieldValidatorGroups = {};
    for (const validation of fieldValidations) {
      if (!validatorGroups[validation.source]) {
        validatorGroups[validation.source] = [];
      }
      validatorGroups[validation.source].push(validation);
    }
    return validatorGroups;
  }, [defaultDataElementId, initialValidations]);

  // Map task validations
  const initialTaskValidations = useMemo(() => {
    if (!initialValidations) {
      return emptyArray;
    }
    return mapBackendIssuesToTaskValidations(initialValidations);
  }, [initialValidations]);

  // Initial validation
  useEffect(() => {
    if (!isFetching) {
      validatorGroups.current = initialValidatorGroups;
      const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups, dataTypes);
      updateBackendValidations(backendValidations, { initial: initialValidations }, initialTaskValidations);
    }
  }, [
    dataTypes,
    initialTaskValidations,
    initialValidations,
    initialValidatorGroups,
    isFetching,
    updateBackendValidations,
  ]);

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
      const backendValidations = mapValidatorGroupsToDataModelValidations(validatorGroups.current, dataTypes);
      updateBackendValidations(backendValidations, { incremental: lastSaveValidations });
    }
  }, [dataTypes, defaultDataElementId, lastSaveValidations, updateBackendValidations]);

  return null;
}
