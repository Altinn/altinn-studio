import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ResourceVersionStatusType } from "resourceadm/types/global";

export const useResourcePolicyPublishStatusQuery = (org: string, repo: string, id: string): UseQueryResult<ResourceVersionStatusType> =>  {
  const { getResourcePublishStatus } = useServicesContext();

  return useQuery<ResourceVersionStatusType>(
    [QueryKey.ResourcePublishStatus, org, repo, id],
    () => getResourcePublishStatus(org, repo, id)
  )
}
