import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type LayoutSettingsParams = {
  layoutSetId: string;
};

export type LayoutSettingsResponse = {
  pages?: {
    order?: string[];
    excludeFromPdf?: string[];
    pdfLayoutName?: string;
  };
  components?: {
    excludeFromPdf?: string[];
  };
};

// ============================================================
// Query Key
// ============================================================

export const layoutSettingsKeys = {
  all: ['layoutSettings'] as const,
  byLayoutSet: (params: LayoutSettingsParams) => [...layoutSettingsKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchLayoutSettings(params: LayoutSettingsParams): Promise<LayoutSettingsResponse> {
  const { layoutSetId } = params;
  const url = `/api/layoutsettings/${layoutSetId}`;
  const response = await apiClient.get<LayoutSettingsResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function layoutSettingsQueryOptions(params: LayoutSettingsParams | undefined) {
  return queryOptions({
    queryKey: layoutSettingsKeys.byLayoutSet(params!),
    queryFn: params ? () => fetchLayoutSettings(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useLayoutSettingsQuery(params: LayoutSettingsParams | undefined) {
  return useQuery(layoutSettingsQueryOptions(params));
}

/** Simple data hook */
export function useLayoutSettings(params: LayoutSettingsParams | undefined) {
  const { data } = useLayoutSettingsQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateLayoutSettings() {
  const queryClient = useQueryClient();

  return (params?: LayoutSettingsParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: layoutSettingsKeys.byLayoutSet(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: layoutSettingsKeys.all,
    });
  };
}
