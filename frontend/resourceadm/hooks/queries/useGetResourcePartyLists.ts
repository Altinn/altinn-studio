import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PartyListResourceLink } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the list of party lists
 *
 * @param org the organisation of the user
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a list of party lists
 */
export const useGetResourcePartyListsQuery = (
  org: string,
  resourceId: string,
  env: string,
): UseQueryResult<PartyListResourceLink[]> => {
  const { getResourcePartyLists } = useServicesContext();

  return useQuery<PartyListResourceLink[]>({
    queryKey: [QueryKey.ResourcePartyLists, resourceId, env],
    queryFn: () => getResourcePartyLists(org, resourceId, env),
    enabled: !!org && !!env && !!resourceId,
  });
};
