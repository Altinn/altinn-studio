import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get a access list with members
 *
 * @param org the organisation of the user
 * @param listIdentifier the list identifier
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a access list with members
 */
export const useGetAccessListQuery = (
  org: string,
  listIdentifier: string,
  env: string,
): UseQueryResult<AccessList> => {
  const { getAccessList } = useServicesContext();

  return useQuery<AccessList>({
    queryKey: [QueryKey.AccessList, listIdentifier, env],
    queryFn: () => getAccessList(org, listIdentifier, env),
    enabled: !!org && !!listIdentifier && !!env,
  });
};
