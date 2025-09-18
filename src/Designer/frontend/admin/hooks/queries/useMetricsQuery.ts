import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { metricsPath } from 'admin/utils/apiPaths';
import type { AppMetric } from 'admin/types/AppMetric';

export const useMetricsQuery = (
  org: string,
  env: string,
  names: string[],
  time: number,
  app?: string,
): UseQueryResult<AppMetric[]> => {
  return useQuery<AppMetric[]>({
    queryKey: [QueryKey.Metrics, org, env, names, time],
    queryFn: async ({ signal }) =>
      (await axios.get<AppMetric[]>(metricsPath(org, env, names, time, app), { signal })).data,
  });
};
