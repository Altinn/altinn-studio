import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { BackendValidationIssue } from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';

// Also used for prefetching @see formPrefetcher.ts
export function useBackendValidationQueryDef(
  enabled: boolean,
  currentLanguage: string,
  instanceId?: string,
  currentTaskId?: string,
): QueryDefinition<BackendValidationIssue[]> {
  const { fetchBackendValidations } = useAppQueries();
  return {
    queryKey: ['validation', instanceId, currentTaskId, enabled],
    queryFn: instanceId ? () => fetchBackendValidations(instanceId, currentLanguage) : () => [],
    enabled,
    gcTime: 0,
  };
}

export function useBackendValidationQuery(enabled: boolean) {
  const currentLanguage = useCurrentLanguage();
  const instance = useLaxInstance();
  const instanceId = instance?.instanceId;
  const currentProcessTaskId = useLaxProcessData()?.currentTask?.elementId;

  const utils = useQuery({
    ...useBackendValidationQueryDef(enabled, currentLanguage, instanceId, currentProcessTaskId),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching initial validations failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}
