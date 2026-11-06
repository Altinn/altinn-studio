import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppHealthMetric } from 'admin/features/apps/types/metrics/AppHealthMetric';
import { appHealthMetricsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getResource } from 'admin/features/apps/utils/getResource';

export const useAppHealthMetricsQuery = (
  org: string,
  env: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<AppHealthMetric[]> => {
  return useQuery<AppHealthMetric[]>({
    queryKey: [QueryKey.AppHealthMetrics, org, env, app],
    queryFn: async ({ signal }) =>
      await getResource<AppHealthMetric[]>(appHealthMetricsPath(org, env, app), { signal }),
    meta,
  });
};
