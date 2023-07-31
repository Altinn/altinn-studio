import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ResourceVersionStatusType } from "resourceadm/types/global";

/**
 * Query to get the status of the versions of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of ResourceVersionStatusType
 */
export const useResourcePolicyPublishStatusQuery = (org: string, repo: string, id: string): UseQueryResult<ResourceVersionStatusType> =>  {
  const { getResourcePublishStatus } = useServicesContext();

  return useQuery<ResourceVersionStatusType>(
    [QueryKey.ResourcePublishStatus, org, repo, id],
    () => getResourcePublishStatus(org, repo, id)
  )
}
