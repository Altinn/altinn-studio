import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicySubject } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

const policySubjectOrg: PolicySubject = {
  subjectDescription: '[org]',
  subjectId: '[org]',
  subjectSource: 'altinn:org',
  subjectTitle: '[org]',
};

/**
 * Query to get the list of subjects for a policy.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param addOrgToList if the value for org should be added to the list of subjects
 *
 * @returns UseQueryResult with a list of subjects of PolicySubject
 */
export const useResourcePolicySubjectsQuery = (
  org: string,
  repo: string,
  addOrgToList?: boolean,
): UseQueryResult<PolicySubject[], AxiosError> => {
  const { getPolicySubjects } = useServicesContext();

  return useQuery<PolicySubject[], AxiosError>({
    queryKey: [QueryKey.ResourcePolicySubjects, org, repo],
    queryFn: () => getPolicySubjects(org, repo),
    select: (policySubjects) => {
      if (
        addOrgToList &&
        !(policySubjects || []).some((d) => d.subjectId === policySubjectOrg.subjectId)
      )
        policySubjects.push(policySubjectOrg);
      return policySubjects;
    },
  });
};
