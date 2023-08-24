import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import type { Policy } from "@altinn/policy-editor";
import { QueryKey } from "app-shared/types/QueryKey";

/**
 * Query to get a policy of an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 *
 * @returns UseQueryResult with an object of Policy
 */
export const useAppPolicyQuery = (
  org: string,
  app: string
): UseQueryResult<Policy> => {
  const { getAppPolicy } = useServicesContext();

  return useQuery<Policy>(
    [QueryKey.AppPolicy, org, app],
    () => getAppPolicy(org, app),
    {
      select: (data) => ({
        rules: data.rules ?? [],
        requiredAuthenticationLevelEndUser: "3",
        requiredAuthenticationLevelOrg: "3",
      }),
    }
  );
};
