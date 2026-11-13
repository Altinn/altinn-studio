import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { PlatformAppDailyMetrics } from 'admin/features/platform/types/PlatformAppDailyMetrics';
import { platformAppDailyMetricsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const usePlatformAppDailyMetricsQuery = (
  env: string,
  days: number,
  meta?: QueryMeta,
): UseQueryResult<PlatformAppDailyMetrics> => {
  return useQuery<PlatformAppDailyMetrics>({
    queryKey: [QueryKey.PlatformAppDailyMetrics, env, days],
    queryFn: async ({ signal }) =>
      (await axios.get<PlatformAppDailyMetrics>(platformAppDailyMetricsPath(env, days), { signal }))
        .data,
    meta,
  });
};
