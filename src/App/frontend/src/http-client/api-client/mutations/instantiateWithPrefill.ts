import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type InstantiateWithPrefillParams = {
  data: {
    instanceOwner?: {
      partyId?: string;
      personNumber?: string;
      organisationNumber?: string;
    };
    prefill?: Record<string, unknown>;
    dueBefore?: string;
    visibleAfter?: string;
  };
  language?: string;
};

export type InstantiateWithPrefillResponse = {
  id: string;
  instanceOwner: {
    partyId: string;
    personNumber?: string;
    organisationNumber?: string;
  };
  appId: string;
  org: string;
  selfLinks: {
    apps: string;
    platform: string;
  };
  dueBefore?: string;
  visibleAfter?: string;
  title?: Record<string, string>;
  status?: {
    isArchived: boolean;
    archived?: string;
    isSoftDeleted: boolean;
    softDeleted?: string;
    isHardDeleted: boolean;
    hardDeleted?: string;
    readStatus: number;
    substatus?: {
      label: string;
      description: string;
    };
  };
  data: Array<{
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
  }>;
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function doInstantiateWithPrefill(
  params: InstantiateWithPrefillParams,
): Promise<InstantiateWithPrefillResponse> {
  const { data, language } = params;
  const languageQuery = language ? `?language=${language}` : '';
  const url = `/api/v1/instances${languageQuery}`;
  const response = await axios.post<InstantiateWithPrefillResponse>(url, data);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useInstantiateWithPrefillMutation() {
  return useMutation({
    mutationFn: doInstantiateWithPrefill,
  });
}

/** Simple mutation hook */
export function useInstantiateWithPrefill() {
  const mutation = useInstantiateWithPrefillMutation();

  return async (params: InstantiateWithPrefillParams): Promise<InstantiateWithPrefillResponse> =>
    mutation.mutateAsync(params);
}
