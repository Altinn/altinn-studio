import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicyAccessPackageAreaGroup } from 'app-shared/types/PolicyAccessPackages';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

/**
 * Query to get the list of access package categories
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of access package categories
 */
export const useResourceAccessPackagesQuery = (
  org: string,
  repo: string,
): UseQueryResult<PolicyAccessPackageAreaGroup[], AxiosError> => {
  const { getAccessPackages } = useServicesContext();

  return useQuery<PolicyAccessPackageAreaGroup[], AxiosError>({
    queryKey: [QueryKey.ResourcePolicyAccessPackages, org],
    queryFn: () => getAccessPackages(org, repo),
  });
};
