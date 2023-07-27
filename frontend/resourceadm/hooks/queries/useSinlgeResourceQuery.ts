import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ResourceBackendType } from "resourceadm/types/global";

export const useSinlgeResourceQuery = (org: string, repo: string, id: string): UseQueryResult<ResourceBackendType> => {
  const { getResource } = useServicesContext();

  return useQuery<ResourceBackendType>(
    [QueryKey.SingleResource, org, repo, id],
    () => getResource(org, repo, id),
  )
}
