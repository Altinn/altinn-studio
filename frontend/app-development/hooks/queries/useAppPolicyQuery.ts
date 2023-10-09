import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { Policy } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';
import { AxiosError } from 'axios';

/**
 * Query to get a policy of an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 *
 * @returns UseQueryResult with an object of Policy
 */
export const useAppPolicyQuery = (org: string, app: string): UseQueryResult<Policy, AxiosError> => {
  const { getAppPolicy } = useServicesContext();

  return useQuery<Policy, AxiosError>(
    [QueryKey.AppPolicy, org, app],
    () => getAppPolicy(org, app),
    {
      select: (data) => {
        // Convert subject string list from uppercase to lowercase
        const rules = data?.rules?.map((rule) => ({
          ...rule,
          subject: rule.subject.map((s) => s.toLowerCase()),
        }));
        const policy: Policy = {
          rules: rules,
          requiredAuthenticationLevelEndUser: '3',
          requiredAuthenticationLevelOrg: '3',
        };
        return policy;
      },
    },
  );
};
