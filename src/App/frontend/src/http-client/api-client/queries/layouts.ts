import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from 'src/http-client/api-client/client';
import type { ILayoutCollection } from 'src/layout/layout';

// ============================================================
// Types
// ============================================================

export type LayoutsParams = {
  layoutSetId: string;
};

// export type LayoutsResponse = Record<string, unknown>;

// ============================================================
// Query Key
// ============================================================

export const layoutsKeys = {
  all: ['layouts'] as const,
  byLayoutSet: (params: LayoutsParams) => [...layoutsKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchLayouts(params: LayoutsParams): Promise<ILayoutCollection> {
  const { layoutSetId } = params;
  const url = `/api/layouts/${layoutSetId}`;
  const response = await apiClient.get<ILayoutCollection>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function layoutsQueryOptions(params: LayoutsParams | undefined) {
  return queryOptions({
    queryKey: layoutsKeys.byLayoutSet(params!),
    queryFn: params ? () => fetchLayouts(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useLayoutsQuery(params: LayoutsParams | undefined) {
  return useQuery(layoutsQueryOptions(params));
}

/** Simple data hook */
export function useLayouts(params: LayoutsParams | undefined) {
  const { data } = useLayoutsQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateLayouts() {
  const queryClient = useQueryClient();

  return (params?: LayoutsParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: layoutsKeys.byLayoutSet(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: layoutsKeys.all,
    });
  };
}
