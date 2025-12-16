import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Metrics } from 'admin/types/metrics/Metrics';
import { metricsPath } from 'admin/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useMetricsQuery = (
  org: string,
  env: string,
  range: number,
  meta?: QueryMeta,
): UseQueryResult<Metrics> => {
  return useQuery<Metrics>({
    queryKey: [QueryKey.Metrics, org, env, range],
    queryFn: async ({ signal }) =>
      (await axios.get<Metrics>(metricsPath(org, env, range), { signal })).data,
    meta,
  });
};
