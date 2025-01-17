import { useCallback, useEffect, useMemo } from 'react';

import { skipToken, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { type BackendValidationIssue, BackendValidationSeverity } from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { appSupportsIncrementalValidationFeatures } from 'src/features/validation/backendValidation/backendValidationUtils';
import { useAsRef } from 'src/hooks/useAsRef';
import { fetchBackendValidationsForDataElement } from 'src/queries/queries';
import type { fetchBackendValidations } from 'src/queries/queries';

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
  forceMarkNoIncrementalUpdates = false,
  instanceId,
  currentLanguage,
  fetchBackendValidations,
}: BackendValidationQueryProps): typeof skipToken | (() => Promise<BackendValidationIssue[]>) {
  if (!instanceId) {
    return skipToken;
  }
  // When incremental validation features are not supported, use the old API to avoid running ITaskValidators,
  // However, use the regular instance validation API when we specifically want non-incremental validations
  return async () =>
    maybeMarkNoIncrementalUpdates(
      await fetchBackendValidations(instanceId, currentLanguage, onlyIncrementalValidators),
      forceMarkNoIncrementalUpdates,
    );
}

type BackendValidationsForDataElementQueryProps = {
  instanceId: string | undefined;
  currentDataElementID: string | undefined;
  currentLanguage: string;
  fetchBackendValidationsForDataElement: typeof fetchBackendValidationsForDataElement;
};

function backendValidationsForDataElementQueryFunc({
  instanceId,
  currentDataElementID,
  currentLanguage,
}: BackendValidationsForDataElementQueryProps): typeof skipToken | (() => Promise<BackendValidationIssue[]>) {
  return !instanceId || !currentDataElementID
    ? skipToken
    : () => fetchBackendValidationsForDataElement(instanceId, currentDataElementID, currentLanguage);
}

// By default we only fetch with incremental validations
export function useBackendValidationQuery(
  options: Omit<
    UseQueryOptions<BackendValidationIssue[], Error, BackendValidationIssue[]>,
    'queryKey' | 'queryFn'
  > = {},
  onlyIncrementalValidators = true,
) {
  const queryKey = useBackendValidationQueryKey();
  const { fetchBackendValidations, fetchBackendValidationsForDataElement } = useAppQueries();
  const hasIncrementalValidationFeatures = appSupportsIncrementalValidationFeatures(useApplicationMetadata());
  const currentDataElementID = useCurrentDataModelGuid();
  const instanceId = useLaxInstanceId();
  const currentLanguage = useAsRef(useCurrentLanguage()).current;

  // should use new endpoint if the app supports incremental validation features or if we specifically want non-incremental validations
  const shouldUseNewEndpoint = hasIncrementalValidationFeatures || !onlyIncrementalValidators;

  const queryFn = shouldUseNewEndpoint
    ? backendValidationQueryFunc({
        // Only set this parameter if the app supports this option
        onlyIncrementalValidators: hasIncrementalValidationFeatures ? onlyIncrementalValidators : undefined,
        instanceId,
        currentLanguage,
        fetchBackendValidations,
      })
    : backendValidationsForDataElementQueryFunc({
        instanceId,
        currentDataElementID,
        currentLanguage,
        fetchBackendValidationsForDataElement,
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
  return useBackendValidationQuery({ throwOnError: false }, onlyIncrementalValidators).refetch;
}
