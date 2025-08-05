import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { appExceptionsPath } from 'admin/utils/apiPaths';
import type { AppException } from 'admin/types/AppException';

export const useAppExceptionsQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<AppException[]> => {
  return useQuery<AppException[]>({
    queryKey: [QueryKey.AppInstances, org, env, app],
    queryFn: async ({ signal }) =>
      (await axios.get<AppException[]>(appExceptionsPath(org, env, app), { signal })).data,
  });
};
