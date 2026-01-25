import { useCallback, useEffect, useMemo } from 'react';

import { skipToken, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { type BackendValidationIssue } from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useAsRef } from 'src/hooks/useAsRef';
import type { fetchBackendValidations } from 'src/queries/queries';

/**
 * The same queryKey must be used for all of the functions below
 */
function useBackendValidationQueryKey() {
  const instanceId = useLaxInstanceId();
  return useMemo(() => ['validation', instanceId], [instanceId]);
}

export function useGetCachedInitialValidations() {
  const queryKey = useBackendValidationQueryKey();
  const client = useQueryClient();

  return useCallback(
    () => ({
      isFetching: client.isFetching({ queryKey }),
      cachedInitialValidations: client.getQueryData<BackendValidationIssue[] | undefined>(queryKey),
    }),
    [client, queryKey],
  );
}

export function useUpdateInitialValidations() {
  const queryKey = useBackendValidationQueryKey();
  const client = useQueryClient();

  return useCallback(
    (validations: BackendValidationIssue[]) => {
      client.setQueryData(queryKey, validations);
    },
    [client, queryKey],
  );
}

export function useIsUpdatingInitialValidations() {
  return useIsFetching({ queryKey: ['validation'] }) > 0;
}

type BackendValidationQueryProps = {
  onlyIncrementalValidators: boolean | undefined;
  forceMarkNoIncrementalUpdates?: boolean;
  instanceId: string | undefined;
  currentLanguage: string;
  fetchBackendValidations: typeof fetchBackendValidations;
};

/**
 * For backwards compatibility, we need to use the old data element validation API for older apps that do not specify if validations are incrementally updated or not.
 * This is because the old API did not run ITaskValidators, and the regular validate API does. If we cannot tell if validations incrementally update, then
 * we cannot distinguish between regular custom validations and ITaskValidator validations (with a field property set), which will block the user from submitting until they refresh.
 */
function backendValidationQueryFunc({
  onlyIncrementalValidators,
  instanceId,
  currentLanguage,
  fetchBackendValidations,
}: BackendValidationQueryProps): typeof skipToken | (() => Promise<BackendValidationIssue[]>) {
  if (!instanceId) {
    return skipToken;
  }
  return async () => await fetchBackendValidations(instanceId, currentLanguage, onlyIncrementalValidators);
}

// By default we only fetch with incremental validations
export function useBackendValidationQuery<TResult = BackendValidationIssue[]>(
  options: Omit<UseQueryOptions<BackendValidationIssue[], Error, TResult>, 'queryKey' | 'queryFn'> = {},
  onlyIncrementalValidators = true,
) {
  const queryKey = useBackendValidationQueryKey();
  const { fetchBackendValidations } = useAppQueries();
  const instanceId = useLaxInstanceId();
  const currentLanguage = useAsRef(useCurrentLanguage()).current;

  const queryFn = backendValidationQueryFunc({
    onlyIncrementalValidators,
    instanceId,
    currentLanguage,
    fetchBackendValidations,
  });

  const query = useQuery({
    queryFn,
    queryKey,
    gcTime: 0,
    ...options,
  });

  useEffect(() => {
    query.error && globalThis.logError('Fetching initial validations failed:\n', query.error);
  }, [query.error]);

  return query;
}

export function useRefetchInitialValidations(onlyIncrementalValidators = true) {
  return useBackendValidationQuery({ throwOnError: false, enabled: false }, onlyIncrementalValidators).refetch;
}
