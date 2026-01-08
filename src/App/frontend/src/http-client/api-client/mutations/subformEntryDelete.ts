import { useMutation } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type SubformEntryDeleteParams = {
  instanceId: string;
  dataElementId: string;
};

export type SubformEntryDeleteResponse = void;

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doSubformEntryDelete(params: SubformEntryDeleteParams): Promise<SubformEntryDeleteResponse> {
  const { instanceId, dataElementId } = params;
  const url = `/api/v1/instances/${instanceId}/data/${dataElementId}`;
  const response = await apiClient.delete(url);

  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to delete sub form');
  }
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useSubformEntryDeleteMutation() {
  return useMutation({
    mutationFn: doSubformEntryDelete,
  });
}

/** Simple mutation hook */
export function useSubformEntryDelete() {
  const mutation = useSubformEntryDeleteMutation();

  return async (params: SubformEntryDeleteParams): Promise<SubformEntryDeleteResponse> => mutation.mutateAsync(params);
}
