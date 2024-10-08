import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicyAccessPackageCategory } from '@altinn/policy-editor';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

/**
 * Query to get the list of access package categories
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with a list of access package categories
 */
export const useResourceAccessPackagesQuery = (
  org: string,
  repo: string,
): UseQueryResult<PolicyAccessPackageCategory[], AxiosError> => {
  const { getAccessPackages } = useServicesContext();

  return useQuery<PolicyAccessPackageCategory[], AxiosError>({
    queryKey: [QueryKey.ResourcePolicyAccessPackages, org, repo],
    queryFn: () => getAccessPackages(org, repo),
  });
};
