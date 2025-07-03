import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import type { SimpleInstance } from 'admin/types/SimpleInstance';
import { instancesListPath } from 'admin/utils/apiPaths';

export const useAppInstances = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<SimpleInstance[]> => {
  return useQuery<SimpleInstance[]>({
    queryKey: [QueryKey.AppInstances, org, env, app],
    queryFn: async () => (await axios.get<SimpleInstance[]>(instancesListPath(org, env, app))).data,
  });
};
