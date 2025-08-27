import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { appProcessTasksPath } from '../../utils/apiPaths';
import type { ProcessTask } from '../../types/ProcessTask';

export const useAppProcessTasks = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<ProcessTask[]> => {
  return useQuery<ProcessTask[]>({
    queryKey: [QueryKey.AppProcessTasks, org, env, app],
    queryFn: async ({ signal }) =>
      (
        await axios.get<ProcessTask[]>(appProcessTasksPath(org, env, app), {
          signal,
        })
      ).data,
  });
};
