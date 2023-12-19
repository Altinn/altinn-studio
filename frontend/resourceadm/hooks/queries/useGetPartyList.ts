import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PartyList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get a party list with members
 *
 * @param org the organisation of the user
 * @param listIdentifier the list identifier
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a party list with members
 */
export const useGetPartyListQuery = (
  org: string,
  listIdentifier: string,
  env: string,
): UseQueryResult<PartyList> => {
  const { getPartyList } = useServicesContext();

  return useQuery<PartyList>({
    queryKey: [QueryKey.PartyList, listIdentifier, env],
    queryFn: () => getPartyList(org, listIdentifier, env),
    enabled: !!org && !!listIdentifier && !!env,
  });
};
