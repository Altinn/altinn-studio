import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the list of access lists (without members)
 *
 * @param org the organisation of the user
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a list of access lists
 */
export const useGetAccessListsQuery = (org: string, env: string): UseQueryResult<AccessList[]> => {
  const { getAccessLists } = useServicesContext();

  return useQuery<AccessList[]>({
    queryKey: [QueryKey.AccessLists, env],
    queryFn: () => getAccessLists(org, env),
    enabled: !!org && !!env,
  });
};
