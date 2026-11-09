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
