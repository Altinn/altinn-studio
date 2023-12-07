import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PartyList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the list of party lists
 *
 * @param org the organisation of the user
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a list of party lists
 */
export const useGetPartyListsQuery = (org: string, env: string): UseQueryResult<PartyList[]> => {
  const { getPartyLists } = useServicesContext();

  return useQuery<PartyList[]>({
    queryKey: [QueryKey.PartyLists, env],
    queryFn: () => getPartyLists(org, env),
    enabled: !!org && !!env,
  });
};
