import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import type { InstancesResponse, SimpleInstance } from 'admin/types/InstancesResponse';
import { instancesListPath } from 'admin/utils/apiPaths';

export const useAppInstancesQuery = (
  org: string,
  env: string,
  app: string,
  currentTask?: string,
): UseInfiniteQueryResult<SimpleInstance[]> => {
  return useInfiniteQuery({
    initialPageParam: undefined,
    queryKey: [QueryKey.AppInstances, org, env, app, currentTask],
    queryFn: async ({ signal, pageParam = null }) =>
      (
        await axios.get<InstancesResponse>(
          instancesListPath(org, env, app, pageParam, currentTask),
          { signal },
        )
      ).data,
    getNextPageParam: (lastPage) => lastPage.continuationToken,
    select: (data) => data.pages.flatMap((page) => page.instances),
  });
};
