import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import type { PolicyAction } from "@altinn/policy-editor";
import { QueryKey } from "app-shared/types/QueryKey";

/**
 * Query to get the list of actions for the policy of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with a list of actions of PolicyAction
 */
export const useResourcePolicyActionsQuery = (
  org: string,
  repo: string
): UseQueryResult<PolicyAction[]> => {
  const { getPolicyActions } = useServicesContext();

  return useQuery<PolicyAction[]>(
    [QueryKey.ResourcePolicyActions, org, repo],
    () => getPolicyActions(org, repo)
  );
};
