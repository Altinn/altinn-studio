import { useCallback, useEffect } from 'react';

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useGetCachedInitialValidations() {
  const instance = useLaxInstance();
  const instanceId = instance?.instanceId;
  const currentProcessTaskId = useLaxProcessData()?.currentTask?.elementId;
  const client = useQueryClient();

  return useCallback(() => {
    const queryKey = ['validation', instanceId, currentProcessTaskId, true];
    return {
      isFetching: client.isFetching({ queryKey }),
      cachedInitialValidations: client.getQueryData(queryKey),
    };
  }, [client, currentProcessTaskId, instanceId]);
}

export function useUpdateInitialValidations() {
  const instance = useLaxInstance();
  const instanceId = instance?.instanceId;
  const currentProcessTaskId = useLaxProcessData()?.currentTask?.elementId;
  const client = useQueryClient();

  return useCallback(
    (validations: BackendValidationIssue[]) => {
      client.setQueryData(['validation', instanceId, currentProcessTaskId, true], validations);
    },
    [client, currentProcessTaskId, instanceId],
  );
}

export function useIsUpdatingInitialValidations() {
  return useIsFetching({ queryKey: ['validation'] }) > 0;
}

export function useInvalidateInitialValidations() {
  const instance = useLaxInstance();
  const instanceId = instance?.instanceId;
  const currentProcessTaskId = useLaxProcessData()?.currentTask?.elementId;
  const client = useQueryClient();

  return useCallback(
    () => client.invalidateQueries({ queryKey: ['validation', instanceId, currentProcessTaskId, true] }),
    [client, currentProcessTaskId, instanceId],
  );
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
