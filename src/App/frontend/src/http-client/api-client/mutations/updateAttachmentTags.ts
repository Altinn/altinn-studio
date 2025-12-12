import { useMutation } from '@tanstack/react-query';

import { apiClient } from '../client';

// ============================================================
// Types
// ============================================================

export type UpdateAttachmentTagsParams = {
  instanceId: string;
  dataElementId: string;
  tags: string[];
};

export type UpdateAttachmentTagsResponse = {
  tags: string[];
  validationIssues?: Array<{
    code: string;
    description: string;
    field: string;
    severity: 'error' | 'warning' | 'informational' | 'success' | 'fixed';
    source: string;
    customTextKey?: string;
    customTextParams?: string[];
  }>;
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doUpdateAttachmentTags(
  params: UpdateAttachmentTagsParams,
): Promise<UpdateAttachmentTagsResponse> {
  const { instanceId, dataElementId, tags } = params;
  const url = `/api/v1/instances/${instanceId}/data/${dataElementId}/tags`;
  const response = await apiClient.put<UpdateAttachmentTagsResponse>(
    url,
    { tags },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (response.status !== 200) {
    throw new Error('Failed to update tags on attachment');
  }

  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useUpdateAttachmentTagsMutation() {
  return useMutation({
    mutationFn: doUpdateAttachmentTags,
  });
}

/** Simple mutation hook */
export function useUpdateAttachmentTags() {
  const mutation = useUpdateAttachmentTagsMutation();

  return async (params: UpdateAttachmentTagsParams): Promise<UpdateAttachmentTagsResponse> =>
    mutation.mutateAsync(params);
}
