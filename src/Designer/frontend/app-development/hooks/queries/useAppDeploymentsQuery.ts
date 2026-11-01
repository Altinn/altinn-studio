import type { UseQueryResult, QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { environmentsOf, type DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';

// Polls only while an app is updating, or an environment could not tell what runs, so a deploy page left open does
// not keep calling every cluster.
export const UPDATING_APP_POLL_INTERVAL_MS = 5000;
export const UNKNOWN_ENVIRONMENT_POLL_INTERVAL_MS = 30000;

export const useAppDeploymentsQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<DeploymentsResponse, Error> => {
  const { getDeployments } = useServicesContext();
  return useQuery<DeploymentsResponse>({
    queryKey: [QueryKey.AppDeployments, owner, app],
    queryFn: () => getDeployments(owner, app),
    // A status page, so returning to it shows what runs now, such as a restart another tab started.
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => pollInterval(query.state.data),
    meta,
  });
};

const pollInterval = (deployments?: DeploymentsResponse): number | false => {
  const environments = environmentsOf(deployments);
  if (environments.some((environment) => environment.runningApp?.status === 'updating')) {
    return UPDATING_APP_POLL_INTERVAL_MS;
  }
  // Such as when a cluster stops answering during an update, which then shows once it answers again.
  if (environments.some((environment) => environment.state === 'unknown')) {
    return UNKNOWN_ENVIRONMENT_POLL_INTERVAL_MS;
  }
  return false;
};
