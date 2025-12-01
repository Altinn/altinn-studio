import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Metric } from 'admin/types/metrics/Metric';
import { metricsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useMetricsQuery = (
  org: string,
  env: string,
  app: string,
  time: number,
  meta?: QueryMeta,
): UseQueryResult<Metric[]> => {
  return useQuery<Metric[]>({
    queryKey: [QueryKey.Metrics, org, env, app, time],
    queryFn: async ({ signal }) =>
      (await axios.get<Metric[]>(metricsPath(org, env, app, time), { signal })).data,
    meta,
  });
};
