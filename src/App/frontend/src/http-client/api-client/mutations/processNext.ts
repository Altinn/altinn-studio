import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../client';

import { processStateKeys } from 'src/http-client/api-client/queries/processState';

// ============================================================
// Types
// ============================================================

export type ProcessNextParams = {
  instanceId: string;
  language?: string;
  action?: string;
};

export type ProcessNextResponse = {
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
// Pure HTTP Layer
// ============================================================

export async function doProcessNext(params: ProcessNextParams): Promise<ProcessNextResponse> {
  const { instanceId, language, action } = params;
  const queryParams = new URLSearchParams();
  if (language) {
    queryParams.set('language', language);
  }
  const queryString = queryParams.toString();
  const suffix = queryString ? `?${queryString}` : '';
  const url = `/instances/${instanceId}/process/next${suffix}`;

  const response = await apiClient.put<ProcessNextResponse>(url, action ? { action } : null);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useProcessNextMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: doProcessNext,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: processStateKeys.detail({ instanceId: variables.instanceId }),
      });
    },
  });
}

/** Simple mutation hook */
export function useProcessNext() {
  const mutation = useProcessNextMutation();

  return async (params: ProcessNextParams): Promise<ProcessNextResponse> => mutation.mutateAsync(params);
}
