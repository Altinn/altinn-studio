import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type SubformEntryAddParams = {
  instanceId: string;
  dataType: string;
  data: unknown;
};

export type SubformEntryAddResponse = {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename?: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks?: {
    apps: string;
    platform: string;
  };
  size: number;
  locked: boolean;
  refs?: string[];
  isRead?: boolean;
  tags?: string[];
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doSubformEntryAdd(params: SubformEntryAddParams): Promise<SubformEntryAddResponse> {
  const { instanceId, dataType, data } = params;
  const url = `/api/v1/instances/${instanceId}/data?dataType=${dataType}`;
  const response = await axios.post<SubformEntryAddResponse>(url, data);

  if (response.status >= 300) {
    throw new Error('Failed to add sub form');
  }

  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useSubformEntryAddMutation() {
  return useMutation({
    mutationFn: doSubformEntryAdd,
  });
}

/** Simple mutation hook */
export function useSubformEntryAdd() {
  const mutation = useSubformEntryAddMutation();

  return async (params: SubformEntryAddParams): Promise<SubformEntryAddResponse> => mutation.mutateAsync(params);
}
