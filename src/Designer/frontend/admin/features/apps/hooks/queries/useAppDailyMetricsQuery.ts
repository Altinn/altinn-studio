import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppDailyMetricsSummary } from 'admin/features/apps/types/metrics/AppDailyMetricsSummary';
import { appDailyMetricsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useAppDailyMetricsQuery = (
  org: string,
  env: string,
  days: number,
  meta?: QueryMeta,
): UseQueryResult<AppDailyMetricsSummary> => {
  return useQuery<AppDailyMetricsSummary>({
    queryKey: [QueryKey.AppDailyMetrics, org, env, days],
    queryFn: async ({ signal }) =>
      (await axios.get<AppDailyMetricsSummary>(appDailyMetricsPath(org, env, days), { signal }))
        .data,
    meta,
  });
};
