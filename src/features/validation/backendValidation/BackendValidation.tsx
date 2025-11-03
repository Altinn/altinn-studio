import { useEffect } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useBackendValidationQuery } from 'src/features/validation/backendValidation/backendValidationQuery';
import {
  mapBackendIssuesToTaskValidations,
  mapBackendValidationsToValidatorGroups,
  mapValidatorGroupsToDataModelValidations,
  useShouldValidateInitial,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import { Validation } from 'src/features/validation/validationContext';

export function BackendValidation() {
  const updateBackendValidations = Validation.useUpdateBackendValidations();
  const defaultDataElementId = DataModels.useDefaultDataElementId();
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const enabled = useShouldValidateInitial();
  const { data: initialValidations, isFetching: isFetchingInitial } = useBackendValidationQuery({ enabled });
  const updateIncrementalValidations = useUpdateIncrementalValidations(false);

  // Initial validation
  useEffect(() => {
    if (!isFetchingInitial) {
      const initialTaskValidations = mapBackendIssuesToTaskValidations(initialValidations);
      const initialValidatorGroups = mapBackendValidationsToValidatorGroups(initialValidations, defaultDataElementId);
      const backendValidations = mapValidatorGroupsToDataModelValidations(initialValidatorGroups);
      updateBackendValidations(backendValidations, { initial: initialValidations }, initialTaskValidations);
    }
  }, [defaultDataElementId, initialValidations, isFetchingInitial, updateBackendValidations]);

  // Incremental validation: Update validators and propagate changes to validation context
  useEffect(() => {
    if (lastSaveValidations) {
      updateIncrementalValidations(lastSaveValidations);
    }
  }, [lastSaveValidations, updateIncrementalValidations]);

  return null;
}
