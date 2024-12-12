import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AccessPackageResource } from '@altinn/policy-editor/types';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

/**
 * Query to get all services using a spesific access package
 *
 * @param accessPackageUrn urn of the access package
 * @param env environment
 *
 * @returns UseQueryResult with a list of services
 */
export const useResourceAccessPackageServicesQuery = (
  accessPackageUrn: string,
  env: string,
  enabled: boolean,
): UseQueryResult<AccessPackageResource[], AxiosError> => {
  const { getAccessPackageServices } = useServicesContext();

  return useQuery<AccessPackageResource[], AxiosError>({
    queryKey: [QueryKey.ResourcePolicyAccessPackageServices, accessPackageUrn, env],
    queryFn: () => getAccessPackageServices(accessPackageUrn, env),
    enabled: enabled,
  });
};
