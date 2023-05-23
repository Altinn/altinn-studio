import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useEnvironmentsQuery = (): UseQueryResult<DeployEnvironment[]> => {
  const { getEnvironments } = useServicesContext();
  return useQuery<DeployEnvironment[]>([QueryKey.Environments], () => getEnvironments());
};
