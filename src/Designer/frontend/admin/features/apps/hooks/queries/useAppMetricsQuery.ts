import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppMetric } from 'admin/features/apps/types/metrics/AppMetric';
import { appMetricsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getResource } from 'admin/features/apps/utils/getResource';

export const useAppMetricsQuery = (
  org: string,
  env: string,
  app: string,
  range: number,
  meta?: QueryMeta,
): UseQueryResult<AppMetric[]> => {
  return useQuery<AppMetric[]>({
    queryKey: [QueryKey.AppMetrics, org, env, app, range],
    queryFn: async ({ signal }) =>
      await getResource<AppMetric[]>(appMetricsPath(org, env, app, range), { signal }),
    meta,
  });
};
