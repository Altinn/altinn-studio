import type { QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicyAction } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get the list of actions for a policy.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with a list of actions of PolicyAction
 */
export const useResourcePolicyActionsQuery = (org: string, repo: string, meta?: QueryMeta) => {
  const { getPolicyActions } = useServicesContext();

  return useQuery<PolicyAction[]>({
    queryKey: [QueryKey.ResourcePolicyActions, org, repo],
    queryFn: () => getPolicyActions(org, repo),
    meta,
  });
};
