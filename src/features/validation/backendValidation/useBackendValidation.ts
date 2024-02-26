import { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useImmer } from 'use-immer';

import type { BackendValidationIssueGroups, BackendValidations, BackendValidatorGroups } from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { mapValidationIssueToFieldValidation } from 'src/features/validation/backendValidation/backendValidationUtils';

interface RetVal {
  validations: BackendValidations;
  processedLast: BackendValidationIssueGroups | undefined;
  initialValidationDone: boolean;
}

interface UseBackendValidationProps {
  enabled?: boolean;
}

export function useBackendValidation({ enabled = true }: UseBackendValidationProps): RetVal {
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const [validatorGroups, setValidatorGroups] = useImmer<BackendValidatorGroups>({});
  const [initialValidationDone, setInitialValidationDone] = useState(false);
  const [processedLast, setProcessedLast] = useState<BackendValidationIssueGroups | undefined>(undefined);

  /**
   * Run full validation initially for each step
   */
  const { fetchBackendValidations } = useAppQueries();
  const instanceId = useLaxInstance()?.instanceId;
  const currentDataElementId = useCurrentDataModelGuid();
  const currentLanguage = useCurrentLanguage();

  const { data: initialValidations } = useQuery({
    cacheTime: 0,
    queryKey: ['validation', instanceId, currentDataElementId],
    enabled,
    queryFn: () =>
      instanceId?.length && currentDataElementId?.length
        ? fetchBackendValidations(instanceId, currentDataElementId, currentLanguage)
        : [],
  });

  /**
   * Overwrite validation groups with initial validation
   */
  useEffect(() => {
    if (initialValidations !== undefined && initialValidations.length > 0) {
      setValidatorGroups(
        initialValidations.map(mapValidationIssueToFieldValidation).reduce((validatorGroups, validation) => {
          if (!validatorGroups[validation.source]) {
            validatorGroups[validation.source] = [];
          }
          validatorGroups[validation.source].push(validation);
          return validatorGroups;
        }, {}) ?? {},
      );
    }

    setInitialValidationDone(initialValidations !== undefined);
  }, [initialValidations, setValidatorGroups]);

  /**
   * Add incremental validation
   */
  useEffect(() => {
    if (lastSaveValidations !== undefined && Object.keys(lastSaveValidations).length > 0) {
      setValidatorGroups((groups) => {
        for (const [group, validationIssues] of Object.entries(lastSaveValidations)) {
          groups[group] = validationIssues.map(mapValidationIssueToFieldValidation);
        }
      });
    }

    setProcessedLast(lastSaveValidations);
  }, [lastSaveValidations, setValidatorGroups]);

  /**
   * Map validator groups to validations per field
   */
  const validations = useMemo(() => {
    const validations: BackendValidations = {
      task: [],
      fields: {},
    };

    for (const group of Object.values(validatorGroups)) {
      for (const validation of group) {
        if ('field' in validation) {
          if (!validations.fields[validation.field]) {
            validations.fields[validation.field] = [];
          }
          validations.fields[validation.field].push(validation);
        } else {
          // Unmapped error (task validation)
          validations.task.push(validation);
        }
      }
    }

    return validations;
  }, [validatorGroups]);

  return {
    validations,
    processedLast,
    initialValidationDone,
  };
}
