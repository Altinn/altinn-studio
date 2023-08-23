import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { PolicySubjectType } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get the list of subjects for the policy of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with a list of subjects of PolicySubjectType
 */
export const useResourcePolicySubjectsQuery = (
  org: string,
  repo: string
): UseQueryResult<PolicySubjectType[]> => {
  const { getPolicySubjects } = useServicesContext();

  return useQuery<PolicySubjectType[]>([QueryKey.ResourcePolicySubjects, org, repo], () =>
    getPolicySubjects(org, repo)
  );
};
