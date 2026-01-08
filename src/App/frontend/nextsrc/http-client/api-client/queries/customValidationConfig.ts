import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type CustomValidationConfigParams = {
  dataTypeId: string;
};

export type CustomValidationConfigResponse = {
  // Expression validation config structure
  [key: string]: unknown;
} | null;

// ============================================================
// Query Key
// ============================================================

export const customValidationConfigKeys = {
  all: ['customValidationConfig'] as const,
  byDataType: (params: CustomValidationConfigParams) => [...customValidationConfigKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchCustomValidationConfig(
  params: CustomValidationConfigParams,
): Promise<CustomValidationConfigResponse> {
  const { dataTypeId } = params;
  const url = `/api/v1/customvalidationconfig/${dataTypeId}`;
  try {
    const response = await apiClient.get<CustomValidationConfigResponse>(url);
    return response.data;
  } catch {
    return null;
  }
}

// ============================================================
// Query Options
// ============================================================

export function customValidationConfigQueryOptions(params: CustomValidationConfigParams | undefined) {
  return queryOptions({
    queryKey: customValidationConfigKeys.byDataType(params!),
    queryFn: params ? () => fetchCustomValidationConfig(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useCustomValidationConfigQuery(params: CustomValidationConfigParams | undefined) {
  return useQuery(customValidationConfigQueryOptions(params));
}

/** Simple data hook */
export function useCustomValidationConfig(params: CustomValidationConfigParams | undefined) {
  const { data } = useCustomValidationConfigQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateCustomValidationConfig() {
  const queryClient = useQueryClient();

  return (params?: CustomValidationConfigParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: customValidationConfigKeys.byDataType(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: customValidationConfigKeys.all,
    });
  };
}
