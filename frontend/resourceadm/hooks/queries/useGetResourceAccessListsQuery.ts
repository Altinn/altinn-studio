import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessListResourceLink } from 'app-shared/types/ResourceAdm';

/**
 * Query to get all access lists connected to a resource
 *
 * @param org the organisation of the user
 * @param resourceId the identifier of the resource
 * @param env the chosen environment
 *
 * @returns UseQueryResult with a list of access lists
 */
export const useGetResourceAccessListsQuery = (
  org: string,
  resourceId: string,
  env: string,
): UseQueryResult<AccessListResourceLink[]> => {
  const { getResourceAccessLists } = useServicesContext();

  return useQuery<AccessListResourceLink[]>({
    queryKey: [QueryKey.ResourceAccessLists, resourceId, env],
    queryFn: () => getResourceAccessLists(org, resourceId, env),
    enabled: !!org && !!env && !!resourceId,
  });
};
