import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { PolicyActionType } from "resourceadm/types/global";

export const useResourcePolicyActionsQuery = (org: string, repo: string): UseQueryResult<PolicyActionType[]> => {
  const { getPolicyActions } = useServicesContext();

  return useQuery<PolicyActionType[]>(
    [QueryKey.ResourcePolicyActions, org, repo],
    () => getPolicyActions(org, repo)
  )
}

