import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppHealthMetric } from 'admin/features/apps/types/metrics/AppHealthMetric';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAppHealthMetricsQuery = (
  org: string,
  env: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<AppHealthMetric[]> => {
  const { getAppHealthMetrics } = useServicesContext();
  return useQuery<AppHealthMetric[]>({
    queryKey: [QueryKey.AppHealthMetrics, org, env, app],
    queryFn: async ({ signal }) => getAppHealthMetrics(org, env, app, signal),
    meta,
  });
};
