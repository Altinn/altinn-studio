import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type OptionsParams = {
  url: string;
};

export type OptionsItem = {
  value: string;
  label?: string;
  description?: string;
  helpText?: string;
};

export type OptionsResponse = {
  data: OptionsItem[];
  headers: Record<string, string>;
};

// ============================================================
// Query Key
// ============================================================

export const optionsKeys = {
  all: ['options'] as const,
  byUrl: (params: OptionsParams) => [...optionsKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchOptions(params: OptionsParams): Promise<OptionsResponse | null> {
  const { url } = params;
  try {
    const response = await apiClient.get<OptionsItem[]>(url);
    return {
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Query Options
// ============================================================

export function optionsQueryOptions(params: OptionsParams | undefined) {
  return queryOptions({
    queryKey: optionsKeys.byUrl(params!),
    queryFn: params ? () => fetchOptions(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useOptionsQuery(params: OptionsParams | undefined) {
  return useQuery(optionsQueryOptions(params));
}

/** Simple data hook */
export function useOptions(params: OptionsParams | undefined) {
  const { data } = useOptionsQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateOptions() {
  const queryClient = useQueryClient();

  return (params?: OptionsParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: optionsKeys.byUrl(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: optionsKeys.all,
    });
  };
}
