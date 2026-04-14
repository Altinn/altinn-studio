import { queryOptions, skipToken } from '@tanstack/react-query';

import type { BackendValidationApi } from 'src/core/api-client/backendValidation.api';
import type { BackendValidationIssue } from 'src/features/validation';

interface BackendValidationQueryParams {
  backendValidationApi: BackendValidationApi;
  instanceId: string | undefined;
  currentLanguage: string;
  onlyIncrementalValidators?: boolean;
}

export const backendValidationQueryKeys = {
  all: () => ['validation'] as const,
  withInstanceId: (instanceId: string | undefined) => [...backendValidationQueryKeys.all(), instanceId] as const,
};

/**
 * For backwards compatibility, we need to use the old data element validation API for older apps that do not specify if validations are incrementally updated or not.
 * This is because the old API did not run ITaskValidators, and the regular validate API does. If we cannot tell if validations incrementally update, then
 * we cannot distinguish between regular custom validations and ITaskValidator validations (with a field property set), which will block the user from submitting until they refresh.
 */
function backendValidationQueryFn({
  backendValidationApi,
  instanceId,
  currentLanguage,
  onlyIncrementalValidators,
}: BackendValidationQueryParams): typeof skipToken | (() => Promise<BackendValidationIssue[]>) {
  if (!instanceId) {
    return skipToken;
  }

  return () => backendValidationApi.fetchBackendValidations(instanceId, currentLanguage, onlyIncrementalValidators);
}

export function backendValidationQuery(params: BackendValidationQueryParams) {
  return queryOptions({
    queryKey: backendValidationQueryKeys.withInstanceId(params.instanceId),
    queryFn: backendValidationQueryFn(params),
    gcTime: 0,
  });
}
