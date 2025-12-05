import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type DynamicsParams = {
  layoutSetId: string;
};

export type DynamicsData = {
  APIs?: Record<string, unknown>;
  ruleConnection?: Record<string, unknown>;
  conditionalRendering?: Record<string, unknown>;
};

export type DynamicsResponse = {
  data: DynamicsData;
} | null;

// ============================================================
// Query Key
// ============================================================

export const dynamicsKeys = {
  all: ['dynamics'] as const,
  byLayoutSet: (params: DynamicsParams) => [...dynamicsKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchDynamics(params: DynamicsParams): Promise<DynamicsResponse> {
  const { layoutSetId } = params;
  const url = `/api/v1/layoutsets/${layoutSetId}/rule-handler/model`;
  try {
    const response = await axios.get<DynamicsData>(url);
    return { data: response.data };
  } catch {
    return null;
  }
}

// ============================================================
// Query Options
// ============================================================

export function dynamicsQueryOptions(params: DynamicsParams | undefined) {
  return queryOptions({
    queryKey: dynamicsKeys.byLayoutSet(params!),
    queryFn: params ? () => fetchDynamics(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useDynamicsQuery(params: DynamicsParams | undefined) {
  return useQuery(dynamicsQueryOptions(params));
}

/** Simple data hook */
export function useDynamics(params: DynamicsParams | undefined) {
  const { data } = useDynamicsQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateDynamics() {
  const queryClient = useQueryClient();

  return (params?: DynamicsParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: dynamicsKeys.byLayoutSet(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: dynamicsKeys.all,
    });
  };
}
