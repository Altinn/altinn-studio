import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type FormDataParams = {
  url: string;
  options?: AxiosRequestConfig;
};

export type FormDataResponse = unknown;

// ============================================================
// Query Key
// ============================================================

export const formDataKeys = {
  all: ['formData'] as const,
  byUrl: (params: { url: string }) => [...formDataKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchFormData(params: FormDataParams): Promise<FormDataResponse> {
  const { url, options } = params;
  const response = await apiClient.get<FormDataResponse>(url, options);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function formDataQueryOptions(params: FormDataParams | undefined) {
  return queryOptions({
    queryKey: formDataKeys.byUrl({ url: params?.url ?? '' }),
    queryFn: params ? () => fetchFormData(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useFormDataQuery(params: FormDataParams | undefined) {
  return useQuery(formDataQueryOptions(params));
}

/** Simple data hook */
export function useFormData(params: FormDataParams | undefined) {
  const { data } = useFormDataQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateFormData() {
  const queryClient = useQueryClient();

  return (params?: { url: string }) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: formDataKeys.byUrl(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: formDataKeys.all,
    });
  };
}
