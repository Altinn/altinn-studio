import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  CollectionFailureFilter,
  WorkflowCollection,
  WorkflowCollectionListResponse,
} from 'admin/features/apps/types/workflows/WorkflowCollection';
import { workflowCollectionsPath } from 'admin/features/apps/utils/apiPaths';
import { getWorkflowEngineResource } from 'admin/features/apps/utils/workflowEngineRequests';
import { isEngineUnavailableError } from 'admin/features/apps/utils/workflowHealth';

export const WORKFLOW_PROBLEMS_PAGE_SIZE = 25;

export type WorkflowProblems = {
  collections: WorkflowCollection[];
  /** Collections matching the filter across all pages, as reported by the engine. */
  totalCount: number;
};

/**
 * Instances the engine holds at least one failed workflow for, in discovery mode.
 *
 * Paginated by the engine's opaque cursor, which is unrelated to the Storage instance list's
 * continuation token — the two lists cannot share a pager.
 */
export const useWorkflowProblemsQuery = (
  org: string,
  env: string,
  app: string,
  failures: CollectionFailureFilter,
): UseInfiniteQueryResult<WorkflowProblems> => {
  return useInfiniteQuery({
    initialPageParam: undefined as string | undefined,
    queryKey: [QueryKey.AppWorkflowProblems, org, env, app, failures],
    queryFn: async ({ signal, pageParam }) =>
      getWorkflowEngineResource<WorkflowCollectionListResponse>(
        workflowCollectionsPath(org, env, app, {
          failures,
          cursor: pageParam,
          pageSize: WORKFLOW_PROBLEMS_PAGE_SIZE,
        }),
        signal,
      ),
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    select: (data) => ({
      collections: data.pages.flatMap((page) => page?.data ?? []),
      totalCount: data.pages[0]?.totalCount ?? 0,
    }),
    // An engine that is not deployed in this environment is a normal state, not something to toast.
    meta: { hideDefaultError: isEngineUnavailableError },
  });
};
