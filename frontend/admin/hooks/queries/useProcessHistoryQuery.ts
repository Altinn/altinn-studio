import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { instanceProcessHistoryPath } from 'admin/utils/apiPaths';

export const useProcessHistoryQuery = (
  org: string,
  env: string,
  app: string,
  instanceId: string,
): UseQueryResult<ProcessHistory> => {
  return useQuery<ProcessHistory>({
    queryKey: [QueryKey.ProcessHistory, org, env, app, instanceId],
    queryFn: async ({ signal }) =>
      (
        await axios.get<ProcessHistory>(instanceProcessHistoryPath(org, env, app, instanceId), {
          signal,
        })
      ).data,
  });
};
