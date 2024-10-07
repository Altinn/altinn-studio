import { useCallback, useEffect, useMemo } from 'react';

import { skipToken, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';

import { type BackendValidationIssue, BackendValidationSeverity } from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { appSupportsIncrementalValidationFeatures } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useAsRef } from 'src/hooks/useAsRef';

/**
 * The same queryKey must be used for all of the functions below
 */
function useBackendValidationQueryKey() {
  const instanceId = useLaxInstanceId();
  const currentProcessTaskId = useLaxProcessData()?.currentTask?.elementId;

  return useMemo(() => ['validation', instanceId, currentProcessTaskId], [currentProcessTaskId, instanceId]);
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

/**
 * For backwards compatibility, this allows you to mark all backend validations as noIncrementalUpdates, which will cause them
 * not to block submit. This should only be used when fetching validations that include non-incremental-validators (ITaskValidator).
 * This is needed when updating validations from process/next, and in <UpdateShowAllErrors />.
 * This is only needed in old apps that do not support onlyIncrementalValidators/noIncrementalUpdates
 */
function maybeMarkNoIncrementalUpdates(validations: BackendValidationIssue[], forceNoIncrementalUpdates: boolean) {
  if (!forceNoIncrementalUpdates) {
    return validations;
  }

  return validations.map((issue) =>
    issue.severity === BackendValidationSeverity.Error ? { ...issue, noIncrementalUpdates: true } : issue,
  );
}

/**
 * Setting forceNoIncrementalUpdates will set the noIncrementalUpdates flag to true for all validation errors.
 * This is needed for old apps that dont support incremental validation features when getting validations from process/next
 * and in <UpdateShowAllErrors />
 */
export function useUpdateInitialValidations() {
  const queryKey = useBackendValidationQueryKey();
  const client = useQueryClient();

  return useCallback(
    (validations: BackendValidationIssue[], forceMarkNoIncrementalUpdates = false) => {
      client.setQueryData(queryKey, maybeMarkNoIncrementalUpdates(validations, forceMarkNoIncrementalUpdates));
    },
    [client, queryKey],
  );
}

export function useIsUpdatingInitialValidations() {
  return useIsFetching({ queryKey: ['validation'] }) > 0;
}

/*
 * This will refetch the validate API with or without non-incremental validations
 */
export function useRefetchInitialValidations(
  onlyIncrementalValidators: boolean,
  forceMarkNoIncrementalUpdates = false,
) {
  const queryFn = useBackendValidationQueryFunc(onlyIncrementalValidators, forceMarkNoIncrementalUpdates);
  const queryKey = useBackendValidationQueryKey();
  const client = useQueryClient();

  return useCallback(() => {
    // To fetch the query again with a potentially different query function, we first need to invalidate the existing query without triggering an automatic refetch
    client.invalidateQueries({ queryKey, refetchType: 'none' });
    // Prefetch query will not throw if it errors, we also don't need the result here, we simply need to fill the cache with the new data
    return client.prefetchQuery({ queryKey, queryFn });
  }, [client, queryFn, queryKey]);
}

/**
 * For backwards compatibility, we need to use the old data element validation API for older apps that do not specify if validations are incrementally updated or not.
 * This is because the old API did not run ITaskValidators, and the regular validate API does. If we cannot tell if validations incrementally update, then
 * we cannot distinguish between regular custom validations and ITaskValidator validations (with a field property set), which will block the user from submitting until they refresh.
 */
function useBackendValidationQueryFunc(onlyIncrementalValidators: boolean, forceMarkNoIncrementalUpdates = false) {
  const { fetchBackendValidations, fetchBackendValidationsForDataElement } = useAppQueries();
  const hasIncrementalValidationFeatures = appSupportsIncrementalValidationFeatures(useApplicationMetadata());
  const currentDataElementID = useCurrentDataModelGuid();
  const instanceId = useLaxInstanceId();
  const currentLanguage = useAsRef(useCurrentLanguage());

  return useMemo(() => {
    // When incremental validation features are not supported, use the old API to avoid running ITaskValidators,
    // However, use the regular instance validation API when we specifically want non-incremental validations
    if (hasIncrementalValidationFeatures || !onlyIncrementalValidators) {
      if (!instanceId) {
        return skipToken;
      }
      return async () =>
        maybeMarkNoIncrementalUpdates(
          await fetchBackendValidations(
            instanceId,
            currentLanguage.current,
            // Only set this parameter if the app supports this option
            hasIncrementalValidationFeatures ? onlyIncrementalValidators : undefined,
          ),
          forceMarkNoIncrementalUpdates,
        );
    } else {
      if (!instanceId || !currentDataElementID) {
        return skipToken;
      }
      return () => fetchBackendValidationsForDataElement(instanceId, currentDataElementID, currentLanguage.current);
    }
  }, [
    hasIncrementalValidationFeatures,
    onlyIncrementalValidators,
    instanceId,
    fetchBackendValidations,
    currentLanguage,
    forceMarkNoIncrementalUpdates,
    currentDataElementID,
    fetchBackendValidationsForDataElement,
  ]);
}

// By default we only fetch with incremental validations
export function useBackendValidationQuery(enabled: boolean) {
  const queryKey = useBackendValidationQueryKey();
  const queryFn = useBackendValidationQueryFunc(true);

  const utils = useQuery({
    queryKey,
    queryFn,
    enabled,
    gcTime: 0,
  });

  useEffect(() => {
    utils.error && window.logError('Fetching initial validations failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}
