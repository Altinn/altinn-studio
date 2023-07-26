import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { PolicyBackendType } from "resourceadm/types/global";

export const useResourcePolicyQuery = (org: string, repo: string, id: string): UseQueryResult<PolicyBackendType> => {
  const { getPolicy } = useServicesContext();

  return useQuery<PolicyBackendType>(
    [QueryKey.ResourcePolicy, org, repo, id],
    () => getPolicy(org, repo, id), { select: (data) => ({
        rules: data.rules ?? [],
        requiredAuthenticationLevelEndUser: '3',
        requiredAuthenticationLevelOrg: '3',
      })
    }
  )
}

