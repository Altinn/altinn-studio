import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from 'src/http-client/api-client/client';
import type { ILayoutCollection } from 'src/layout/layout';

// ============================================================
// Types
// ============================================================

export type LayoutSetsResponse = {
  sets: Array<{
    id: string;
    dataType?: string;
    tasks?: string[];
  }>;
};

// ============================================================
// Query Key
// ============================================================

export const layoutSetsKeys = {
  all: ['layoutSets'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchLayoutSets(): Promise<ILayoutCollection> {
  const url = '/api/layoutsets';
  const response = await apiClient.get<ILayoutCollection>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function layoutSetsQueryOptions() {
  return queryOptions({
    queryKey: layoutSetsKeys.all,
    queryFn: fetchLayoutSets,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useLayoutSetsQuery() {
  return useQuery(layoutSetsQueryOptions());
}

/** Simple data hook */
export function useLayoutSets() {
  const { data } = useLayoutSetsQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateLayoutSets() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: layoutSetsKeys.all,
    });
}
