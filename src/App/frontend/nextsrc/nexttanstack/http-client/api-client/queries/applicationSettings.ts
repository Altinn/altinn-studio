import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type ApplicationSettingsResponse = Record<string, string>;

// ============================================================
// Query Key
// ============================================================

export const applicationSettingsKeys = {
  all: ['applicationSettings'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchApplicationSettings(): Promise<ApplicationSettingsResponse> {
  const url = '/api/v1/applicationsettings';
  const response = await apiClient.get<ApplicationSettingsResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function applicationSettingsQueryOptions() {
  return queryOptions({
    queryKey: applicationSettingsKeys.all,
    queryFn: fetchApplicationSettings,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useApplicationSettingsQuery() {
  return useQuery(applicationSettingsQueryOptions());
}

/** Simple data hook */
export function useApplicationSettings() {
  const { data } = useApplicationSettingsQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateApplicationSettings() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: applicationSettingsKeys.all,
    });
}
