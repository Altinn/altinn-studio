import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DEPLOYMENTS_REFETCH_INTERVAL } from 'app-shared/constants';
import type { AppDeployment } from 'app-shared/types/api/AppDeployment';

export const useAppDeploymentsQuery = (
  owner,
  app,
  meta?: QueryMeta,
): UseQueryResult<AppDeployment[], Error> => {
  const { getDeployments } = useServicesContext();
  return useQuery<AppDeployment[]>({
    queryKey: [QueryKey.AppDeployments, owner, app],
    queryFn: () => getDeployments(owner, app).then((res) => res?.results || []),
    refetchInterval: DEPLOYMENTS_REFETCH_INTERVAL,
    meta,
  });
};
