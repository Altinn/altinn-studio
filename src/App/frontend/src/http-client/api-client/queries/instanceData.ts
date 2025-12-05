import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type InstanceDataParams = {
  instanceOwnerPartyId: string;
  instanceGuid: string;
};

export type InstanceDataResponse = {
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
    substatus?: { label: string; description: string };
  };
  data: Array<{
    id: string;
    instanceGuid: string;
    dataType: string;
    filename?: string;
    contentType: string;
    blobStoragePath: string;
    selfLinks: { apps: string; platform: string };
    size: number;
    locked: boolean;
    refs?: string[];
    isRead: boolean;
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
// Query Key
// ============================================================

export const instanceDataKeys = {
  all: ['instanceData'] as const,
  detail: (params: InstanceDataParams) => [...instanceDataKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchInstanceData(params: InstanceDataParams): Promise<InstanceDataResponse> {
  const { instanceOwnerPartyId, instanceGuid } = params;
  const url = `/instances/${instanceOwnerPartyId}/${instanceGuid}`;
  const response = await axios.get<InstanceDataResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function instanceDataQueryOptions(params: InstanceDataParams | undefined) {
  return queryOptions({
    queryKey: instanceDataKeys.detail(params!),
    queryFn: params ? () => fetchInstanceData(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useInstanceDataQuery(params: InstanceDataParams | undefined) {
  return useQuery(instanceDataQueryOptions(params));
}

/** Simple data hook */
export function useInstanceData(params: InstanceDataParams | undefined) {
  const { data } = useInstanceDataQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateInstanceData() {
  const queryClient = useQueryClient();

  return (params?: InstanceDataParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: instanceDataKeys.detail(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: instanceDataKeys.all,
    });
  };
}
