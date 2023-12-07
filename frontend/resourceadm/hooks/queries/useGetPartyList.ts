import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PartyListWithMembers } from 'app-shared/types/ResourceAdm';

/**
 * Query to get a party list with members
 *
 * @param org the organisation of the user
 * @param listId the list id
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a party list with members
 */
export const useGetPartyListQuery = (
  org: string,
  listId: string,
  env: string,
): UseQueryResult<PartyListWithMembers> => {
  const { getPartyList } = useServicesContext();

  return useQuery<PartyListWithMembers>({
    queryKey: [QueryKey.PartyList, listId, env],
    queryFn: () => getPartyList(org, listId, env),
    enabled: !!org && !!listId && !!env,
  });
};
