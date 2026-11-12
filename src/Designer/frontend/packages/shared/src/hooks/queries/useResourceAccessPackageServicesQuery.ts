import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AccessPackageResource } from 'app-shared/types/PolicyAccessPackages';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { HttpError } from 'app-shared/utils/networking';

/**
 * Query to get all services using a specific access package
 *
 * @param accessPackageUrn urn of the access package
 * @param env environment
 *
 * @returns UseQueryResult with a list of services
 */
export const useResourceAccessPackageServicesQuery = (
  accessPackageUrn: string,
  env: string,
): UseQueryResult<AccessPackageResource[], HttpError> => {
  const { getAccessPackageServices } = useServicesContext();

  return useQuery<AccessPackageResource[], HttpError>({
    queryKey: [QueryKey.ResourcePolicyAccessPackageServices, accessPackageUrn, env],
    queryFn: () => getAccessPackageServices(accessPackageUrn, env),
  });
};
