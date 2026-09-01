import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Policy } from '@altinn/policy-editor';

/**
 * Query to get resources and apps with policy files containing at least one Altinn 2 subject
 *
 * @param org the organization of the user
 * @param org the env
 *
 * @returns UseQueryResult with a list of resource identifiers with policies
 */
export const useGetAltinn2ResourcePoliciesQuery = (
  org: string,
  env: string,
): UseQueryResult<{ identifier?: string; policy?: Policy; resourceType: string }[]> => {
  const { getAltinn2ResourcePolicies } = useServicesContext();

  return useQuery<{ identifier?: string; policy?: Policy; resourceType: string }[]>({
    queryKey: [QueryKey.Altinn2ResourcePolicies, org, env],
    queryFn: () => getAltinn2ResourcePolicies(org, env),
  });
};
