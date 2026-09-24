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

/**
 * How often the instance page reads the engine again, whatever it holds. An operator drives the
 * process from the app, or from another tab, while watching this page, and a new transition's
 * workflows only ever appear through a read — so this page never stops asking, and asks every
 * second: close enough to live for a step that takes a few seconds, and one small list read per
 * open page for the gateway.
 */
export const INSTANCE_VIEW_REFETCH_INTERVAL_MS = 1_000;

/** The Storage side of the same page — the process task, status and data elements — a little slower. */
export const INSTANCE_DETAILS_REFETCH_INTERVAL_MS = 2_000;

/**
 * The instance lists — the Storage list, its health column and the problems list — read again
 * every so often even when nothing is in flight: new instances arrive from the app, not from
 * anything this page does, and an operator leaves the list open while they work elsewhere.
 */
export const INSTANCE_LIST_REFETCH_INTERVAL_MS = 30_000;

/** Statuses the engine will still move on its own. Everything else is terminal until an operator acts. */
export const ACTIVE_WORKFLOW_STATUSES: readonly PersistentItemStatus[] = [
  'Enqueued',
  'Processing',
  'Requeued',
  'Waiting',
  'Held',
];

type Pages<TPage> = InfiniteData<TPage | null | undefined> | undefined;

/** Poll fast while `isActive`, and at the list cadence otherwise. */
export function refetchWhileActive(isActive: boolean): number {
  return isActive ? ACTIVE_WORK_REFETCH_INTERVAL_MS : INSTANCE_LIST_REFETCH_INTERVAL_MS;
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
