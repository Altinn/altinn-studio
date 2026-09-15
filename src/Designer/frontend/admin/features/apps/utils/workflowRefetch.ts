import type { InfiniteData } from '@tanstack/react-query';
import type { WorkflowCollectionListResponse } from 'admin/features/apps/types/workflows/WorkflowCollection';
import type {
  PersistentItemStatus,
  WorkflowListResponse,
} from 'admin/features/apps/types/workflows/WorkflowStatus';

/**
 * How often an engine-backed view refetches while the engine still has work in flight for what it
 * shows. The ops verbs only enqueue, so the state an operator is waiting for arrives after the
 * verb's own refetch; without this, and with window-focus refetching off, the drill-down and the
 * health column would sit on the stale answer until the operator reloaded.
 */
export const ACTIVE_WORK_REFETCH_INTERVAL_MS = 15_000;

/** Statuses the engine will still move on its own. Everything else is terminal until an operator acts. */
export const ACTIVE_WORKFLOW_STATUSES: readonly PersistentItemStatus[] = [
  'Enqueued',
  'Processing',
  'Requeued',
  'Waiting',
  'Held',
];

type Pages<TPage> = InfiniteData<TPage | null | undefined> | undefined;

/** Poll while `isActive`, otherwise leave the query alone. */
export function refetchWhileActive(isActive: boolean): number | false {
  return isActive ? ACTIVE_WORK_REFETCH_INTERVAL_MS : false;
}

export function hasActiveWorkflows(data: Pages<WorkflowListResponse>): boolean {
  return (data?.pages ?? []).some((page) =>
    (page?.data ?? []).some((workflow) =>
      ACTIVE_WORKFLOW_STATUSES.includes(workflow.overallStatus),
    ),
  );
}

export function hasActiveCollections(
  response: WorkflowCollectionListResponse | null | undefined,
): boolean {
  return (response?.data ?? []).some((collection) => (collection.workflowCounts?.active ?? 0) > 0);
}

export function hasActiveCollectionPages(data: Pages<WorkflowCollectionListResponse>): boolean {
  return (data?.pages ?? []).some(hasActiveCollections);
}
