import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ResourceBackend } from 'resourceadm/types/global';

/**
 * Query to get the a single resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of ResourceBackend
 */
export const useSinlgeResourceQuery = (
  org: string,
  repo: string,
  id: string
): UseQueryResult<ResourceBackend> => {
  const { getResource } = useServicesContext();

  return useQuery<ResourceBackend>([QueryKey.SingleResource, org, repo, id], () =>
    getResource(org, repo, id)
  );
};
