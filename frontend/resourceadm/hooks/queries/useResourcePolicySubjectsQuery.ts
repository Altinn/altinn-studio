import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { PolicySubjectType } from "resourceadm/types/global";

export const useResourcePolicySubjectsQuery = (org: string, repo: string): UseQueryResult<PolicySubjectType[]> => {
  const { getPolicySubjects } = useServicesContext();

  return useQuery<PolicySubjectType[]>(
    [QueryKey.ResourcePolicySubjects, org, repo],
    () => getPolicySubjects(org, repo)
  )
}

