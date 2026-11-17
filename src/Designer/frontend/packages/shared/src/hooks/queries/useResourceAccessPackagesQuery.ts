import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PolicyAccessPackageAreaGroup } from 'app-shared/types/PolicyAccessPackages';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { HttpError } from 'app-shared/utils/networking';

/**
 * Query to get the list of access package categories
 *
 * @param org the organization of the user
 *
 * @returns UseQueryResult with a list of access package categories
 */
export const useResourceAccessPackagesQuery = (
  org: string,
  repo: string,
): UseQueryResult<PolicyAccessPackageAreaGroup[], HttpError> => {
  const { getAccessPackages } = useServicesContext();

  return useQuery<PolicyAccessPackageAreaGroup[], HttpError>({
    queryKey: [QueryKey.ResourcePolicyAccessPackages, org],
    queryFn: () => getAccessPackages(org, repo),
  });
};
