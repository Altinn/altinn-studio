import { useCallback, useEffect, useMemo } from 'react';

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { useBackendValidationApi } from 'src/core/contexts/ApiProvider';
import {
  backendValidationQuery,
  backendValidationQueryKeys,
} from 'src/core/queries/backendValidation/backendValidation.queries';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useAsRef } from 'src/hooks/useAsRef';
import type { BackendValidationIssue } from 'src/features/validation';

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
  onlyIncrementalValidators = true,
  options: Pick<UseQueryOptions<BackendValidationIssue[], Error, TResult>, 'enabled' | 'throwOnError'> = {},
) {
  const backendValidationApi = useBackendValidationApi();
  const instanceId = useLaxInstanceId();
  const currentLanguage = useAsRef(useCurrentLanguage()).current;

  const queryOptions = backendValidationQuery({
    backendValidationApi,
    instanceId,
    currentLanguage,
    onlyIncrementalValidators,
  });

  const query = useQuery({
    queryKey: queryOptions.queryKey,
    queryFn: queryOptions.queryFn,
    gcTime: queryOptions.gcTime,
    enabled: options.enabled,
    throwOnError: options.throwOnError,
  });

  useEffect(() => {
    query.error && window.logError('Fetching initial validations failed:\n', query.error);
  }, [query.error]);

  return query;
}

export function useRefetchInitialValidations(onlyIncrementalValidators = true) {
  return useBackendValidationQuery(onlyIncrementalValidators, { throwOnError: false, enabled: false }).refetch;
}

export { backendValidationQueryKeys };
