import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type BackendValidationsParams = {
  instanceId: string;
  language: string;
  onlyIncrementalValidators?: boolean;
};

export type BackendValidationIssue = {
  code: string;
  description: string;
  field: string;
  severity: 'error' | 'warning' | 'informational' | 'success' | 'fixed';
  source: string;
  customTextKey?: string;
  customTextParams?: string[];
};

export type BackendValidationsResponse = BackendValidationIssue[];

// ============================================================
// Query Key
// ============================================================

export const backendValidationsKeys = {
  all: ['backendValidations'] as const,
  byInstance: (params: BackendValidationsParams) => [...backendValidationsKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchBackendValidations(params: BackendValidationsParams): Promise<BackendValidationsResponse> {
  const { instanceId, language, onlyIncrementalValidators } = params;
  const incrementalQuery =
    onlyIncrementalValidators !== undefined ? `&onlyIncrementalValidators=${onlyIncrementalValidators}` : '';
  const url = `/api/v1/instances/${instanceId}/validate?language=${language}${incrementalQuery}`;
  const response = await axios.get<BackendValidationsResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function backendValidationsQueryOptions(params: BackendValidationsParams | undefined) {
  return queryOptions({
    queryKey: backendValidationsKeys.byInstance(params!),
    queryFn: params ? () => fetchBackendValidations(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useBackendValidationsQuery(params: BackendValidationsParams | undefined) {
  return useQuery(backendValidationsQueryOptions(params));
}

/** Simple data hook */
export function useBackendValidations(params: BackendValidationsParams | undefined) {
  const { data } = useBackendValidationsQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateBackendValidations() {
  const queryClient = useQueryClient();

  return (params?: BackendValidationsParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: backendValidationsKeys.byInstance(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: backendValidationsKeys.all,
    });
  };
}
