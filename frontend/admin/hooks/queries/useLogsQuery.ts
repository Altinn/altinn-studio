import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { logsPath } from 'admin/utils/apiPaths';
import type { Log } from 'admin/types/Log';

export const useLogsQuery = (
  org: string,
  env: string,
  time: number,
  app?: string,
): UseQueryResult<Log[]> => {
  return useQuery<Log[]>({
    queryKey: [QueryKey.Logs, org, env, time, app],
    queryFn: async ({ signal }) =>
      (await axios.get<Log[]>(logsPath(org, env, time, app), { signal })).data,
  });
};
