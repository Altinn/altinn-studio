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
  processIsComplete?: boolean,
  archiveReference?: string,
  confirmed?: boolean,
): UseInfiniteQueryResult<SimpleInstance[]> => {
  return useInfiniteQuery({
    initialPageParam: undefined,
    queryKey: [
      QueryKey.AppInstances,
      org,
      env,
      app,
      currentTask,
      processIsComplete,
      archiveReference,
      confirmed,
    ],
    queryFn: async ({ signal, pageParam = undefined }) =>
      (
        await axios.get<InstancesResponse>(
          instancesListPath(
            org,
            env,
            app,
            pageParam,
            currentTask,
            processIsComplete,
            archiveReference,
            confirmed,
          ),
          { signal },
        )
      ).data,
    getNextPageParam: (lastPage) => lastPage.continuationToken,
    select: (data) => data.pages.flatMap((page) => page.instances),
  });
};
