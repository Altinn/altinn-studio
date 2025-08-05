import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { containerLogsPath } from 'admin/utils/apiPaths';
import type { ContainerLog } from 'admin/types/ContainerLog';

export const useContainerLogsQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<ContainerLog[]> => {
  return useQuery<ContainerLog[]>({
    queryKey: [QueryKey.AppInstances, org, env, app],
    queryFn: async ({ signal }) =>
      (await axios.get<ContainerLog[]>(containerLogsPath(org, env, app), { signal })).data,
  });
};
