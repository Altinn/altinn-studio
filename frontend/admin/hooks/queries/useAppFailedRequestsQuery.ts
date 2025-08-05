import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { appFailedRequestsPath } from 'admin/utils/apiPaths';
import type { AppFailedRequest } from 'admin/types/AppFailedRequest';

export const useAppFailedRequestsQuery = (
  org: string,
  env: string,
  app: string,
  time: string,
): UseQueryResult<AppFailedRequest[]> => {
  return useQuery<AppFailedRequest[]>({
    queryKey: [QueryKey.AppFailedRequests, org, env, app],
    queryFn: async ({ signal }) =>
      (await axios.get<AppFailedRequest[]>(appFailedRequestsPath(org, env, app, time), { signal }))
        .data,
  });
};
