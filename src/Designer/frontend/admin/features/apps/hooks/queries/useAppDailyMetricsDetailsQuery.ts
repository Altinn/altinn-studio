import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppDailyMetricsDetails } from 'admin/features/apps/types/metrics/AppDailyMetricsDetails';
import { appDailyMetricsDetailsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';

export const useAppDailyMetricsDetailsQuery = (
  org: string,
  env: string,
  app: string,
  days: number,
  meta?: QueryMeta,
): UseQueryResult<AppDailyMetricsDetails> => {
  return useQuery<AppDailyMetricsDetails>({
    queryKey: [QueryKey.AppDailyMetricsDetails, org, env, app, days],
    queryFn: async ({ signal }) =>
      (
        await axios.get<AppDailyMetricsDetails>(appDailyMetricsDetailsPath(org, env, app, days), {
          signal,
        })
      ).data,
    meta,
  });
};
