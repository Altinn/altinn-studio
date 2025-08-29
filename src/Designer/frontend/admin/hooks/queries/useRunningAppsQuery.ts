import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { RunningApplication } from 'admin/types/RunningApplication';
import { runningAppsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useRunningAppsQuery = (
  org: string,
): UseQueryResult<Record<string, RunningApplication[]>> => {
  return useQuery<Record<string, RunningApplication[]>>({
    queryKey: [QueryKey.RunningApps, org],
    queryFn: async ({ signal }) =>
      (await axios.get<Record<string, RunningApplication[]>>(runningAppsPath(org), { signal }))
        .data,
  });
};
