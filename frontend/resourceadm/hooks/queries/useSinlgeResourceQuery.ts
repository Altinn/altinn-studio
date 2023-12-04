import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Resource } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the a single resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of Resource
 */
export const useSinlgeResourceQuery = (
  org: string,
  repo: string,
  id: string,
): UseQueryResult<Resource> => {
  const { getResource } = useServicesContext();

  return useQuery<Resource>({
    queryKey: [QueryKey.SingleResource, org, repo, id],
    queryFn: () => getResource(org, repo, id),
  });
};
