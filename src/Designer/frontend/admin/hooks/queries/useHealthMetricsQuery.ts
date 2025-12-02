import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { HealthMetric } from 'admin/types/metrics/HealthMetric';
import { healthMetricsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useHealthMetricsQuery = (
  org: string,
  env: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<HealthMetric[]> => {
  return useQuery<HealthMetric[]>({
    queryKey: [QueryKey.HealthMetrics, org, env, app],
    queryFn: async ({ signal }) =>
      (await axios.get<HealthMetric[]>(healthMetricsPath(org, env, app), { signal })).data,
    meta,
  });
};
