import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeployPermissionsQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<string[]> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.DeployPermissions, owner, app],
    queryFn: () => getDeployPermissions(owner, app),
    meta,
  });
};
