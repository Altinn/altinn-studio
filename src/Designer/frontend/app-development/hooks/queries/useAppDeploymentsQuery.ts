import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';

// Polls only while an app is updating, so a deploy page left open does not keep calling every cluster.
export const UPDATING_APP_POLL_INTERVAL_MS = 5000;

export const useAppDeploymentsQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<DeploymentsResponse, Error> => {
  const { getDeployments } = useServicesContext();
  return useQuery<DeploymentsResponse>({
    queryKey: [QueryKey.AppDeployments, owner, app],
    queryFn: () => getDeployments(owner, app),
    refetchInterval: (query) =>
      isAnyAppUpdating(query.state.data) ? UPDATING_APP_POLL_INTERVAL_MS : false,
    meta,
  });
};

const isAnyAppUpdating = (deployments?: DeploymentsResponse): boolean =>
  (deployments?.runningAppList ?? []).some((runningApp) => runningApp.status === 'updating');
