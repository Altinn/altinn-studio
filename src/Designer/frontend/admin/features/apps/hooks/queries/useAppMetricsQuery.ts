import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppMetric } from 'admin/features/apps/types/metrics/AppMetric';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAppMetricsQuery = (
  org: string,
  env: string,
  app: string,
  range: number,
  meta?: QueryMeta,
): UseQueryResult<AppMetric[]> => {
  const { getAppMetrics } = useServicesContext();
  return useQuery<AppMetric[]>({
    queryKey: [QueryKey.AppMetrics, org, env, app, range],
    queryFn: async ({ signal }) => getAppMetrics(org, env, app, range, signal),
    meta,
  });
};
