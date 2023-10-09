import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicySubject } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get the list of subjects for the policy of a resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with a list of subjects of PolicySubject
 */
export const useResourcePolicySubjectsQuery = (
  org: string,
  repo: string,
): UseQueryResult<PolicySubject[]> => {
  const { getPolicySubjects } = useServicesContext();

  return useQuery<PolicySubject[]>(
    [QueryKey.ResourcePolicySubjects, org, repo],
    () => getPolicySubjects(org, repo),
    {
      select: (data) => {
        return data.filter((subject) => subject.subjectId !== '');
      },
    },
  );
};
