import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';

export const useAppDeploymentsQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<DeploymentsResponse, Error> => {
  const { getDeployments } = useServicesContext();
  return useQuery<DeploymentsResponse>({
    queryKey: [QueryKey.AppDeployments, owner, app],
    queryFn: () => getDeployments(owner, app),
    meta,
  });
};
