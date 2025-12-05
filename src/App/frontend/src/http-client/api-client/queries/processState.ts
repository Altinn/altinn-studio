import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type ProcessStateParams = {
  instanceId: string;
};

export type ProcessStateResponse = {
  started: string;
  startEvent?: string;
  currentTask?: {
    flow: number;
    started: string;
    elementId: string;
    name: string;
    altinnTaskType: string;
    ended?: string;
    validated?: {
      timestamp: string;
      canCompleteTask: boolean;
    };
  };
  ended?: string;
  endEvent?: string;
};

// ============================================================
// Query Key
// ============================================================

export const processStateKeys = {
  all: ['processState'] as const,
  detail: (params: ProcessStateParams) => [...processStateKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchProcessState(params: ProcessStateParams): Promise<ProcessStateResponse> {
  const { instanceId } = params;
  const url = `/instances/${instanceId}/process`;
  const response = await axios.get<ProcessStateResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function processStateQueryOptions(params: ProcessStateParams | undefined) {
  return queryOptions({
    queryKey: processStateKeys.detail(params!),
    queryFn: params ? () => fetchProcessState(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useProcessStateQuery(params: ProcessStateParams | undefined) {
  return useQuery(processStateQueryOptions(params));
}

/** Simple data hook */
export function useProcessState(params: ProcessStateParams | undefined) {
  const { data } = useProcessStateQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateProcessState() {
  const queryClient = useQueryClient();

  return (params?: ProcessStateParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: processStateKeys.detail(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: processStateKeys.all,
    });
  };
}
