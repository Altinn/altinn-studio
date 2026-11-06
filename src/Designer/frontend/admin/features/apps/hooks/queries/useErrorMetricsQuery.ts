import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ErrorMetric } from 'admin/features/apps/types/metrics/ErrorMetric';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useErrorMetricsQuery = (
  org: string,
  env: string,
  range: number,
  meta?: QueryMeta,
): UseQueryResult<ErrorMetric[]> => {
  const { getErrorMetrics } = useServicesContext();
  return useQuery<ErrorMetric[]>({
    queryKey: [QueryKey.ErrorMetrics, org, env, range],
    queryFn: async ({ signal }) => getErrorMetrics(org, env, range, signal),
    meta,
  });
};
