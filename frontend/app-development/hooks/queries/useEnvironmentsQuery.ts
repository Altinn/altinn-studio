import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { QueryKey } from 'app-shared/types/QueryKey';
import { QueryMeta } from '@tanstack/react-query/build/lib';

export const useEnvironmentsQuery = (meta?: QueryMeta): UseQueryResult<DeployEnvironment[]> => {
  const { getEnvironments } = useServicesContext();
  return useQuery<DeployEnvironment[]>([QueryKey.Environments], () => getEnvironments(), { meta });
};
