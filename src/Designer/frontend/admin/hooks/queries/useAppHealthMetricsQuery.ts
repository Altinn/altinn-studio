import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppHealthMetric } from 'admin/types/metrics/AppHealthMetric';
import { appHealthMetricsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useAppHealthMetricsQuery = (
  org: string,
  env: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<AppHealthMetric[]> => {
  return useQuery<AppHealthMetric[]>({
    queryKey: [QueryKey.AppHealthMetrics, org, env, app],
    queryFn: async ({ signal }) =>
      (await axios.get<AppHealthMetric[]>(appHealthMetricsPath(org, env, app), { signal })).data,
    meta,
  });
};
