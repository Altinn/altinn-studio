import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type ExternalApiParams = {
  instanceId: string;
  externalApiId: string;
};

export type ExternalApiResponse = unknown;

// ============================================================
// Query Key
// ============================================================

export const externalApiKeys = {
  all: ['externalApi'] as const,
  byId: (params: ExternalApiParams) => [...externalApiKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchExternalApi(params: ExternalApiParams): Promise<ExternalApiResponse> {
  const { instanceId, externalApiId } = params;
  const url = `/api/v1/instances/${instanceId}/api/external/${externalApiId}`;
  const response = await apiClient.get<ExternalApiResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function externalApiQueryOptions(params: ExternalApiParams | undefined) {
  return queryOptions({
    queryKey: externalApiKeys.byId(params!),
    queryFn: params ? () => fetchExternalApi(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useExternalApiQuery(params: ExternalApiParams | undefined) {
  return useQuery(externalApiQueryOptions(params));
}

/** Simple data hook */
export function useExternalApi(params: ExternalApiParams | undefined) {
  const { data } = useExternalApiQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateExternalApi() {
  const queryClient = useQueryClient();

  return (params?: ExternalApiParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: externalApiKeys.byId(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: externalApiKeys.all,
    });
  };
}
