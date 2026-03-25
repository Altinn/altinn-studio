import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ErrorMetric } from 'admin/features/apps/types/metrics/ErrorMetric';
import { errorMetricsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useErrorMetricsQuery = (
  org: string,
  env: string,
  range: number,
  meta?: QueryMeta,
): UseQueryResult<ErrorMetric[]> => {
  return useQuery<ErrorMetric[]>({
    queryKey: [QueryKey.ErrorMetrics, org, env, range],
    queryFn: async ({ signal }) =>
      (await axios.get<ErrorMetric[]>(errorMetricsPath(org, env, range), { signal })).data,
    meta,
  });
};
