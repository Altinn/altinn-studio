import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type FooterLayoutResponse = {
  footer: Array<{
    type: string;
    title?: string;
    target?: string;
    icon?: string;
  }>;
} | null;

// ============================================================
// Query Key
// ============================================================

export const footerLayoutKeys = {
  all: ['footerLayout'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchFooterLayout(): Promise<FooterLayoutResponse> {
  const url = '/api/v1/footer';
  const response = await apiClient.get<FooterLayoutResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function footerLayoutQueryOptions() {
  return queryOptions({
    queryKey: footerLayoutKeys.all,
    queryFn: fetchFooterLayout,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useFooterLayoutQuery() {
  return useQuery(footerLayoutQueryOptions());
}

/** Simple data hook */
export function useFooterLayout() {
  const { data } = useFooterLayoutQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateFooterLayout() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: footerLayoutKeys.all,
    });
}
