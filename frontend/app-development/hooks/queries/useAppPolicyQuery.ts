import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { PolicyBackendType } from '@altinn/policy-editor/src/types';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get a policy of an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 *
 * @returns UseQueryResult with an object of PolicyBackendType
 */
export const useAppPolicyQuery = (org: string, app: string): UseQueryResult<PolicyBackendType> => {
  const { getAppPolicy } = useServicesContext();

  return useQuery<PolicyBackendType>([QueryKey.AppPolicy, org, app], () => getAppPolicy(org, app), {
    select: (data) => ({
      rules: data.rules ?? [],
      requiredAuthenticationLevelEndUser: '3',
      requiredAuthenticationLevelOrg: '3',
    }),
  });
};
