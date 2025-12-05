import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type PartiesAllowedToInstantiateResponse = Array<{
  partyId: number;
  partyTypeName: number;
  orgNumber?: string;
  ssn?: string;
  unitType?: string;
  name: string;
  isDeleted: boolean;
  onlyHierarchyElementWithNoAccess: boolean;
  childParties?: PartiesAllowedToInstantiateResponse;
}>;

// ============================================================
// Query Key
// ============================================================

export const partiesAllowedToInstantiateKeys = {
  all: ['partiesAllowedToInstantiate'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchPartiesAllowedToInstantiate(): Promise<PartiesAllowedToInstantiateResponse> {
  const url = '/api/v1/parties?allowedToInstantiateFilter=true';
  const response = await axios.get<PartiesAllowedToInstantiateResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function partiesAllowedToInstantiateQueryOptions() {
  return queryOptions({
    queryKey: partiesAllowedToInstantiateKeys.all,
    queryFn: fetchPartiesAllowedToInstantiate,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function usePartiesAllowedToInstantiateQuery() {
  return useQuery(partiesAllowedToInstantiateQueryOptions());
}

/** Simple data hook */
export function usePartiesAllowedToInstantiate() {
  const { data } = usePartiesAllowedToInstantiateQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidatePartiesAllowedToInstantiate() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: partiesAllowedToInstantiateKeys.all,
    });
}
