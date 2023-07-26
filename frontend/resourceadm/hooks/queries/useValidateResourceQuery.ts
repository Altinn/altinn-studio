import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ValidationType } from "resourceadm/types/global";

export const useValidateResourceQuery = (org: string, repo: string, id: string): UseQueryResult<ValidationType> => {
  const { getValidateResource } = useServicesContext();

  return useQuery<ValidationType>(
    [QueryKey.ValidateResource, org, repo, id],
    () => getValidateResource(org, repo, id), { select: (data) => ({ status: data.status }) }
  )
}

