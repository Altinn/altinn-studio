import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type InstantiateParams = {
  partyId: number;
  language?: string;
};

export type InstantiateResponse = {
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

export async function doInstantiate(params: InstantiateParams): Promise<InstantiateResponse> {
  const { partyId, language } = params;
  const languageQuery = language ? `&language=${language}` : '';
  const url = `/api/v1/instances?instanceOwnerPartyId=${partyId}${languageQuery}`;
  const response = await axios.post<InstantiateResponse>(url);
  return response.data;
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query mutation hook */
export function useInstantiateMutation() {
  return useMutation({
    mutationFn: doInstantiate,
  });
}

/** Simple mutation hook */
export function useInstantiate() {
  const mutation = useInstantiateMutation();

  return async (params: InstantiateParams): Promise<InstantiateResponse> => mutation.mutateAsync(params);
}
