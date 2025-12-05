import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type ReturnUrlParams = {
  queryParameterReturnUrl: string;
};

export type ReturnUrlResponse = string;

// ============================================================
// Query Key
// ============================================================

export const returnUrlKeys = {
  all: ['returnUrl'] as const,
  byUrl: (params: ReturnUrlParams) => [...returnUrlKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchReturnUrl(params: ReturnUrlParams): Promise<ReturnUrlResponse> {
  const { queryParameterReturnUrl } = params;
  const url = `/api/v1/redirect?url=${encodeURIComponent(queryParameterReturnUrl)}`;
  const response = await axios.get<ReturnUrlResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function returnUrlQueryOptions(params: ReturnUrlParams | undefined) {
  return queryOptions({
    queryKey: returnUrlKeys.byUrl(params!),
    queryFn: params ? () => fetchReturnUrl(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useReturnUrlQuery(params: ReturnUrlParams | undefined) {
  return useQuery(returnUrlQueryOptions(params));
}

/** Simple data hook */
export function useReturnUrl(params: ReturnUrlParams | undefined) {
  const { data } = useReturnUrlQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateReturnUrl() {
  const queryClient = useQueryClient();

  return (params?: ReturnUrlParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: returnUrlKeys.byUrl(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: returnUrlKeys.all,
    });
  };
}
