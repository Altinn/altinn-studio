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
import { INSTANCE_VIEW_REFETCH_INTERVAL_MS } from 'admin/features/apps/utils/workflowRefetch';

export const INSTANCE_WORKFLOWS_PAGE_SIZE = 25;

/**
 * Every workflow the engine holds for one instance — head workflows and the deliberately invisible
 * side chains alike — in the order the process ran them. The engine lists newest first and pages
 * backwards in time, so the view sorts what it has by creation time, and a further page adds older
 * workflows at the top.
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
    // The operator drives the process from elsewhere while watching this page, and the verbs
    // only enqueue: the state they wait for arrives later. So the drill-down keeps asking.
    refetchInterval: INSTANCE_VIEW_REFETCH_INTERVAL_MS,
    // The global default leaves window focus alone; this view is the one an operator comes back
    // to after fixing the app, so it reads again when they do.
    refetchOnWindowFocus: true,
    staleTime: INSTANCE_VIEW_REFETCH_INTERVAL_MS,
    select: (data) =>
      data.pages
        .flatMap((page) => page?.data ?? [])
        .toSorted(
          (first, second) =>
            new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
        ),
    meta: { hideDefaultError: isEngineUnavailableError },
  });
};
