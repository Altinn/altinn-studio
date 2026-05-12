import { useCallback, useEffect, useMemo } from 'react';

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackendValidationApi } from 'src/core/contexts/ApiProvider';
import {
  backendValidationQuery,
  backendValidationQueryKeys,
} from 'src/core/queries/backendValidation/backendValidation.queries';
import { FormStore } from 'src/features/form/FormContext';
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
  const bootstrapInitial = FormStore.bootstrap.useAllInitialValidationIssues() ?? undefined;
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

function useBackendValidationQueryOptions(onlyIncrementalValidators: boolean) {
  const backendValidationApi = useBackendValidationApi();
  const instanceId = useLaxInstanceId();
  const currentLanguage = useAsRef(useCurrentLanguage()).current;

  return backendValidationQuery({
    backendValidationApi,
    instanceId,
    currentLanguage,
    onlyIncrementalValidators,
  });
}

export interface UseBackendValidationQueryResult {
  validations: BackendValidationIssue[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export interface UseBackendValidationQueryOptions {
  enabled?: boolean;
}
// By default we only fetch with incremental validations
export function useBackendValidationQuery(
  onlyIncrementalValidators = true,
  options: UseBackendValidationQueryOptions = {},
): UseBackendValidationQueryResult {
  const queryOptions = useBackendValidationQueryOptions(onlyIncrementalValidators);

  const query = useQuery({
    ...queryOptions,
    enabled: options.enabled,
  });

  useEffect(() => {
    query.error && window.logError('Fetching initial validations failed:\n', query.error);
  }, [query.error]);

  return { validations: query.data, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useRefetchInitialValidations(onlyIncrementalValidators = true) {
  const queryOptions = useBackendValidationQueryOptions(onlyIncrementalValidators);
  const query = useQuery({
    ...queryOptions,
    enabled: false,
    throwOnError: false,
  });
  return query.refetch;
}
