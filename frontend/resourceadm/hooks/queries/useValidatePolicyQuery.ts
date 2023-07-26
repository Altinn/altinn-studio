import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ValidationType } from "resourceadm/types/global";

export const useValidatePolicyQuery = (org: string, repo: string, id: string): UseQueryResult<ValidationType> => {
  const { getValidatePolicy } = useServicesContext();

  return useQuery<ValidationType>(
    [QueryKey.ValidatePolicy, org, repo, id],
    () => getValidatePolicy(org, repo, id), { select: (data) => ({ status: data.status }) }
  )
}

