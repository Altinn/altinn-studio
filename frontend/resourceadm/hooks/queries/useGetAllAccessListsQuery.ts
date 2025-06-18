import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the list of access lists in all environments (without members)
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of all access lists
 */
export const useGetAllAccessListsQuery = (
  org: string,
  enabled: boolean,
): UseQueryResult<AccessList[]> => {
  const { getAllAccessLists } = useServicesContext();

  return useQuery<AccessList[]>({
    queryKey: [QueryKey.AllAccessLists, org],
    queryFn: () => getAllAccessLists(org),
    enabled: enabled,
    meta: {
      hideDefaultError: true,
    },
  });
};
