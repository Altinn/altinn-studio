import { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useImmer } from 'use-immer';

import type {
  BackendValidationIssue,
  BackendValidationIssueGroups,
  BackendValidatorGroups,
  FieldValidations,
} from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { type QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import {
  mapValidationIssueToFieldValidation,
  useShouldValidateInitial,
} from 'src/features/validation/backendValidation/backendValidationUtils';

interface RetVal {
  validations: FieldValidations;
  processedLast: BackendValidationIssueGroups | undefined;
  initialValidationDone: boolean;
}

// Also used for prefetching @see formPrefetcher.ts
export function useBackendValidationQueryDef(
  enabled: boolean,
  currentLanguage: string,
  instanceId?: string,
  currentDataElementId?: string,
  currentTaskId?: string,
): QueryDefinition<BackendValidationIssue[]> {
  const { fetchBackendValidations } = useAppQueries();
  return {
    queryKey: ['validation', instanceId, currentDataElementId, currentTaskId, enabled],
    queryFn:
      instanceId && currentDataElementId
        ? () => fetchBackendValidations(instanceId, currentDataElementId, currentLanguage)
        : () => [],
    enabled,
    gcTime: 0,
  };
}

export function useBackendValidation(): RetVal {
  const lastSaveValidations = FD.useLastSaveValidationIssues();
  const [validatorGroups, setValidatorGroups] = useImmer<BackendValidatorGroups>({});
  const [initialValidationDone, setInitialValidationDone] = useState(false);
  const [processedLast, setProcessedLast] = useState<BackendValidationIssueGroups | undefined>(undefined);

  /**
   * Run full validation initially for each step
   */
  const instanceId = useLaxInstance()?.instanceId;
  const currentDataElementId = useCurrentDataModelGuid();
  const currentProcessTaskId = useLaxProcessData()?.currentTask?.elementId;
  const currentLanguage = useCurrentLanguage();
  const enabled = useShouldValidateInitial();

  const { data: initialValidations } = useQuery(
    useBackendValidationQueryDef(enabled, currentLanguage, instanceId, currentDataElementId, currentProcessTaskId),
  );

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
    const validations: FieldValidations = {};

    for (const [key, group] of Object.entries(validatorGroups)) {
      for (const validation of group) {
        if ('field' in validation) {
          if (!validations[validation.field]) {
            validations[validation.field] = [];
          }
          validations[validation.field].push(validation);
        } else {
          // Unmapped error (task validation)
          window.logWarn(
            `When validating the datamodel, validator ${key} returned a validation error without a field\n`,
            validation,
          );
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
