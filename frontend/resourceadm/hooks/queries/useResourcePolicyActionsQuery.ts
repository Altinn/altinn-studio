import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { PolicyActionType } from "resourceadm/types/global";

/**
 * Query to get the list of actions for the policy of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with a list of actions of PolicyActionType
 */
export const useResourcePolicyActionsQuery = (org: string, repo: string): UseQueryResult<PolicyActionType[]> => {
  const { getPolicyActions } = useServicesContext();

  return useQuery<PolicyActionType[]>(
    [QueryKey.ResourcePolicyActions, org, repo],
    () => getPolicyActions(org, repo)
  )
}

