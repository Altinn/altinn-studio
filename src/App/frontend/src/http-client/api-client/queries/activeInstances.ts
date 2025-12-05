import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type ActiveInstancesParams = {
  partyId: number;
};

export type ActiveInstancesResponse = Array<{
  id: string;
  lastChanged: string;
  lastChangedBy: string;
}>;

// ============================================================
// Query Key
// ============================================================

export const activeInstancesKeys = {
  all: ['activeInstances'] as const,
  byParty: (params: ActiveInstancesParams) => [...activeInstancesKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchActiveInstances(params: ActiveInstancesParams): Promise<ActiveInstancesResponse> {
  const { partyId } = params;
  const url = `/api/v1/parties/${partyId}/instances`;
  const response = await axios.get<ActiveInstancesResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function activeInstancesQueryOptions(params: ActiveInstancesParams | undefined) {
  return queryOptions({
    queryKey: activeInstancesKeys.byParty(params!),
    queryFn: params ? () => fetchActiveInstances(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useActiveInstancesQuery(params: ActiveInstancesParams | undefined) {
  return useQuery(activeInstancesQueryOptions(params));
}

/** Simple data hook */
export function useActiveInstances(params: ActiveInstancesParams | undefined) {
  const { data } = useActiveInstancesQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateActiveInstances() {
  const queryClient = useQueryClient();

  return (params?: ActiveInstancesParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: activeInstancesKeys.byParty(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: activeInstancesKeys.all,
    });
  };
}
