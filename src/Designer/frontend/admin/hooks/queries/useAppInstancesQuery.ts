import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios, { isAxiosError } from 'axios';
import type { InstancesResponse, SimpleInstance } from 'admin/types/InstancesResponse';
import { instancesListPath } from 'admin/utils/apiPaths';

export const useAppInstancesQuery = (
  org: string,
  env: string,
  app: string,
  currentTask?: string,
  isArchived?: boolean,
  archiveReference?: string,
  confirmed?: boolean,
  isSoftDeleted?: boolean,
  isHardDeleted?: boolean,
  createdBefore?: string,
): UseInfiniteQueryResult<SimpleInstance[]> => {
  return useInfiniteQuery({
    initialPageParam: undefined,
    queryKey: [
      QueryKey.AppInstances,
      org,
      env,
      app,
      currentTask,
      isArchived,
      archiveReference,
      confirmed,
      isSoftDeleted,
      isHardDeleted,
      createdBefore,
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
            isArchived,
            archiveReference,
            confirmed,
            isSoftDeleted,
            isHardDeleted,
            createdBefore,
          ),
          { signal },
        )
      ).data,
    getNextPageParam: (lastPage) => lastPage.continuationToken,
    select: (data) => data.pages.flatMap((page) => page.instances),
    meta: {
      hideDefaultError: (error: any) =>
        isAxiosError(error) &&
        ([403, 404] as (number | undefined)[]).includes(error.response?.status),
    },
  });
};
