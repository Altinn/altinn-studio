import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  WorkflowListResponse,
  WorkflowStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { workflowsListPath } from 'admin/features/apps/utils/apiPaths';
import { getWorkflowEngineResource } from 'admin/features/apps/utils/workflowEngineRequests';
import { isEngineUnavailableError } from 'admin/features/apps/utils/workflowHealth';

export const INSTANCE_WORKFLOWS_PAGE_SIZE = 25;

/**
 * Every workflow the engine holds for one instance — head workflows and the deliberately invisible
 * side chains alike, newest first.
 */
export const useInstanceWorkflowsQuery = (
  org: string,
  env: string,
  app: string,
  collectionKey: string | undefined,
): UseInfiniteQueryResult<WorkflowStatus[]> => {
  return useInfiniteQuery({
    initialPageParam: undefined as string | undefined,
    queryKey: [QueryKey.AppInstanceWorkflows, org, env, app, collectionKey],
    enabled: collectionKey !== undefined,
    queryFn: async ({ signal, pageParam }) =>
      getWorkflowEngineResource<WorkflowListResponse>(
        workflowsListPath(org, env, app, {
          collectionKey,
          cursor: pageParam,
          pageSize: INSTANCE_WORKFLOWS_PAGE_SIZE,
        }),
        signal,
      ),
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    select: (data) =>
      data.pages
        .flatMap((page) => page?.data ?? [])
        .toSorted(
          (first, second) =>
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        ),
    meta: { hideDefaultError: isEngineUnavailableError },
  });
};
