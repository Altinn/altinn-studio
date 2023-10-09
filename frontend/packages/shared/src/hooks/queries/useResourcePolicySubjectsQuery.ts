import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicySubject } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';
import { AxiosError } from 'axios';

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

  return useQuery<PolicySubject[], AxiosError>([QueryKey.ResourcePolicySubjects, org, repo], () =>
    getPolicySubjects(org, repo),
  );
};
