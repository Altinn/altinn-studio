import type { QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Policy, RequiredAuthLevel } from 'app-shared/types/Policy';

const DEFAULT_AUTH_LEVEL: RequiredAuthLevel = '3';

/**
 * Query to get a policy of an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 *
 * @returns UseQueryResult with an object of Policy
 */
export const useAppPolicyQuery = (org: string, app: string, meta?: QueryMeta) => {
  const { getAppPolicy } = useServicesContext();

  return useQuery<Policy>({
    queryKey: [QueryKey.AppPolicy, org, app],
    queryFn: () => getAppPolicy(org, app),
    select: (response: Policy): Policy => mapAppPolicyResponse(response),
    meta,
  });
};
const mapAppPolicyResponse = (appPolicy: Policy): Policy => {
  return {
    rules: appPolicy?.rules ?? [],
    requiredAuthenticationLevelEndUser:
      appPolicy?.requiredAuthenticationLevelEndUser ?? DEFAULT_AUTH_LEVEL,
    requiredAuthenticationLevelOrg: DEFAULT_AUTH_LEVEL,
  };
};
