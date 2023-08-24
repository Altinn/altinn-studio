import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ResourceVersionStatus } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the status of the versions of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of ResourceVersionStatus
 */
export const useResourcePolicyPublishStatusQuery = (
  org: string,
  repo: string,
  id: string
): UseQueryResult<ResourceVersionStatus> => {
  const { getResourcePublishStatus } = useServicesContext();

  return useQuery<ResourceVersionStatus>([QueryKey.ResourcePublishStatus, org, repo, id], () =>
    getResourcePublishStatus(org, repo, id)
  );
};
