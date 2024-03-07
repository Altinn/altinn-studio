import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { QueryKey } from 'app-shared/types/QueryKey';

const sortedEnvironmentNames = ['production', 'tt02', 'yt01', 'at21', 'at22', 'at23', 'at24'];
const compare = (a: DeployEnvironment, b: DeployEnvironment) => {
  const index1 = sortedEnvironmentNames.indexOf(a.name.toLowerCase());
  const index2 = sortedEnvironmentNames.indexOf(b.name.toLowerCase());
  return index1 === -1 || index2 === -1 ? -1 : index1 - index2;
};

export const useEnvironmentsQuery = (meta?: QueryMeta): UseQueryResult<DeployEnvironment[]> => {
  const { getEnvironments } = useServicesContext();
  return useQuery<DeployEnvironment[]>({
    queryKey: [QueryKey.Environments],
    queryFn: async () => {
      const environments = await getEnvironments();
      return [...environments].sort(compare);
    },
    meta,
  });
};
