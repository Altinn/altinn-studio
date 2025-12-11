import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type OrgsResponse = {
  orgs: Record<
    string,
    {
      name: Record<string, string>;
      logo: string;
      orgnr: string;
      homepage: string;
      environments: string[];
    }
  >;
};

// ============================================================
// Query Key
// ============================================================

export const orgsKeys = {
  all: ['orgs'] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchOrgs(): Promise<OrgsResponse> {
  const url = 'https://altinncdn.no/orgs/altinn-orgs.json';
  const response = await axios.get<OrgsResponse>(url, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function orgsQueryOptions() {
  return queryOptions({
    queryKey: orgsKeys.all,
    queryFn: fetchOrgs,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useOrgsQuery() {
  return useQuery(orgsQueryOptions());
}

/** Simple data hook */
export function useOrgs() {
  const { data } = useOrgsQuery();
  return data;
}

/** Invalidation hook */
export function useInvalidateOrgs() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: orgsKeys.all,
    });
}
