import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeployPermissionsQuery = (owner, app): UseQueryResult<string[]> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<string[]>([QueryKey.DeployPermissions, owner, app], () =>
    getDeployPermissions(owner, app)
  );
};
