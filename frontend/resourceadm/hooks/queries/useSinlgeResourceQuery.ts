import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ResourceBackendType } from "resourceadm/types/global";

/**
 * Query to get the a single resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 *
 * @returns UseQueryResult with an object of ResourceBackendType
 */
export const useSinlgeResourceQuery = (org: string, repo: string, id: string): UseQueryResult<ResourceBackendType> => {
  const { getResource } = useServicesContext();

  return useQuery<ResourceBackendType>(
    [QueryKey.SingleResource, org, repo, id],
    () => getResource(org, repo, id),
  )
}
