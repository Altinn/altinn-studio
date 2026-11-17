import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppDeploymentEvent } from 'admin/features/apps/types/AppDeploymentEvent';
import { appDeploymentsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

/** The deploys and undeploys of the app that finished at or after `since`, oldest first. */
export const useAppDeploymentsQuery = (
  org: string,
  env: string,
  app: string,
  since: string,
  meta?: QueryMeta,
): UseQueryResult<AppDeploymentEvent[]> => {
  return useQuery<AppDeploymentEvent[]>({
    queryKey: [QueryKey.AppDeployments, org, env, app, since],
    queryFn: async ({ signal }) =>
      (await axios.get<AppDeploymentEvent[]>(appDeploymentsPath(org, env, app, since), { signal }))
        .data,
    meta,
  });
};
