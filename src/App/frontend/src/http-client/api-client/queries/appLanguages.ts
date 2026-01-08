import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type AppLanguagesResponse = Array<{
  language: string;
}>;

// ============================================================
// Query Key
// ============================================================

export const appLanguagesKeys = {
  all: ['appLanguages'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchAppLanguages(): Promise<AppLanguagesResponse> {
  const url = '/api/v1/applicationlanguages';
  const response = await apiClient.get<AppLanguagesResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function appLanguagesQueryOptions() {
  return queryOptions({
    queryKey: appLanguagesKeys.all,
    queryFn: fetchAppLanguages,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useAppLanguagesQuery() {
  return useQuery(appLanguagesQueryOptions());
}

/** Simple data hook */
export function useAppLanguages() {
  const { data } = useAppLanguagesQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateAppLanguages() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: appLanguagesKeys.all,
    });
}
