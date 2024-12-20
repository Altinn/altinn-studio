import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { fetchRoles } from 'src/queries/queries';
import type { Role } from 'src/types/shared';

export type RoleResult = { data: Role[] | undefined; error: Error | null };

export function useCurrentPartyRolesQueryDef(): UseQueryOptions<Role[], Error> {
  return {
    queryKey: ['fetchCurrentPartyRoles'],
    queryFn: fetchRoles,
    staleTime: 1000 * 60 * 10,
  };
}

export const useCurrentPartyRoles = (): RoleResult => {
  const query = useQuery(useCurrentPartyRolesQueryDef());
  return { data: query.data, error: query.error };
};
