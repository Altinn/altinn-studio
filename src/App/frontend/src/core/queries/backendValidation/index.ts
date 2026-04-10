import { useCallback, useEffect, useMemo } from 'react';

import { skipToken, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { useBackendValidationApi } from 'src/core/contexts/ApiProvider';
import { backendValidationQueryKeys } from 'src/core/queries/backendValidation/backendValidation.queries';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useAsRef } from 'src/hooks/useAsRef';
import type { BackendValidationIssue } from 'src/features/validation';

type BackendValidationQueryProps = {
  onlyIncrementalValidators: boolean | undefined;
  instanceId: string | undefined;
  currentLanguage: string;
  fetchBackendValidations: (
    instanceId: string,
    language: string,
    onlyIncrementalValidators?: boolean,
  ) => Promise<BackendValidationIssue[]>;
};

function backendValidationQueryFunc({
  onlyIncrementalValidators,
  instanceId,
  currentLanguage,
  fetchBackendValidations,
}: BackendValidationQueryProps): typeof skipToken | (() => Promise<BackendValidationIssue[]>) {
  if (!instanceId) {
    return skipToken;
  }

  return () => fetchBackendValidations(instanceId, currentLanguage, onlyIncrementalValidators);
}

/**
 * The same queryKey must be used for all of the functions below
 */
function useBackendValidationQueryKey() {
  const instanceId = useLaxInstanceId();
  return useMemo(() => backendValidationQueryKeys.withInstanceId(instanceId), [instanceId]);
}

export function useGetCachedInitialValidations() {
  const bootstrapInitial = FormBootstrap.useAllInitialValidationIssues() ?? undefined;
  const queryKey = useBackendValidationQueryKey();
  const client = useQueryClient();

  return useCallback(
    () => ({
      isFetching: client.isFetching({ queryKey }),
      cachedInitialValidations: client.getQueryData<BackendValidationIssue[] | undefined>(queryKey) ?? bootstrapInitial,
    }),
    [bootstrapInitial, client, queryKey],
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
  return useIsFetching({ queryKey: backendValidationQueryKeys.all() }) > 0;
}

// By default we only fetch with incremental validations
export function useBackendValidationQuery<TResult = BackendValidationIssue[]>(
  options: Omit<UseQueryOptions<BackendValidationIssue[], Error, TResult>, 'queryKey' | 'queryFn'> = {},
  onlyIncrementalValidators = true,
) {
  const backendValidationApi = useBackendValidationApi();
  const queryKey = useBackendValidationQueryKey();
  const instanceId = useLaxInstanceId();
  const currentLanguage = useAsRef(useCurrentLanguage()).current;

  const queryFn = backendValidationQueryFunc({
    onlyIncrementalValidators,
    instanceId,
    currentLanguage,
    fetchBackendValidations: backendValidationApi.fetchBackendValidations,
  });

  const query = useQuery({
    queryFn,
    queryKey,
    gcTime: 0,
    ...options,
  });

  useEffect(() => {
    query.error && window.logError('Fetching initial validations failed:\n', query.error);
  }, [query.error]);

  return query;
}

export function useRefetchInitialValidations(onlyIncrementalValidators = true) {
  return useBackendValidationQuery({ throwOnError: false, enabled: false }, onlyIncrementalValidators).refetch;
}

export { backendValidationQueryKeys };
