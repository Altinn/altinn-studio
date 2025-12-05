import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type AttachmentUploadParams = {
  instanceId: string;
  dataTypeId: string;
  language: string;
  file: File;
  contentType: string;
};

export type AttachmentUploadResponse = {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks: {
    apps: string;
    platform: string;
  };
  size: number;
  locked: boolean;
  refs?: string[];
  isRead: boolean;
  tags?: string[];
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doAttachmentUpload(params: AttachmentUploadParams): Promise<AttachmentUploadResponse> {
  const { instanceId, dataTypeId, language, file, contentType } = params;
  const url = `/instances/${instanceId}/data?dataType=${dataTypeId}&language=${language}`;

  const response = await axios.post<AttachmentUploadResponse>(url, file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  });

  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useAttachmentUploadMutation() {
  return useMutation({
    mutationFn: doAttachmentUpload,
  });
}

/** Simple mutation hook */
export function useAttachmentUpload() {
  const mutation = useAttachmentUploadMutation();

  return async (params: AttachmentUploadParams): Promise<AttachmentUploadResponse> => mutation.mutateAsync(params);
}
