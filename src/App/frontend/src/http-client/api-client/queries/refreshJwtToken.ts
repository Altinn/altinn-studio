import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type RefreshJwtTokenResponse = unknown;

// ============================================================
// Query Key
// ============================================================

export const refreshJwtTokenKeys = {
  all: ['refreshJwtToken'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchRefreshJwtToken(): Promise<RefreshJwtTokenResponse> {
  const url = '/api/authentication/refresh';
  const response = await apiClient.get<RefreshJwtTokenResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function refreshJwtTokenQueryOptions() {
  return queryOptions({
    queryKey: refreshJwtTokenKeys.all,
    queryFn: fetchRefreshJwtToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useRefreshJwtTokenQuery() {
  return useQuery(refreshJwtTokenQueryOptions());
}

/** Simple data hook */
export function useRefreshJwtToken() {
  const { data } = useRefreshJwtTokenQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateRefreshJwtToken() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: refreshJwtTokenKeys.all,
    });
}
