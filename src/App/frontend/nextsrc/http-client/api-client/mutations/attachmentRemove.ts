import { useMutation } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type AttachmentRemoveParams = {
  instanceId: string;
  dataElementId: string;
  language: string;
};

export type AttachmentRemoveResponse = void;

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doAttachmentRemove(params: AttachmentRemoveParams): Promise<AttachmentRemoveResponse> {
  const { instanceId, dataElementId, language } = params;
  const url = `/instances/${instanceId}/data/${dataElementId}?language=${language}`;

  const response = await apiClient.delete(url);

  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to remove attachment');
  }
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useAttachmentRemoveMutation() {
  return useMutation({
    mutationFn: doAttachmentRemove,
  });
}

/** Simple mutation hook */
export function useAttachmentRemove() {
  const mutation = useAttachmentRemoveMutation();

  return async (params: AttachmentRemoveParams): Promise<AttachmentRemoveResponse> => mutation.mutateAsync(params);
}
