import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppMetric } from 'admin/features/apps/types/metrics/AppMetric';
import { appErrorMetricsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import { get } from 'app-shared/utils/networking';

export const useAppErrorMetricsQuery = (
  org: string,
  env: string,
  app: string,
  range: number,
  meta?: QueryMeta,
): UseQueryResult<AppMetric[]> => {
  return useQuery<AppMetric[]>({
    queryKey: [QueryKey.AppErrorMetrics, org, env, app, range],
    queryFn: async ({ signal }) =>
      await get<AppMetric[]>(appErrorMetricsPath(org, env, app, range), { signal }),
    meta,
  });
};
