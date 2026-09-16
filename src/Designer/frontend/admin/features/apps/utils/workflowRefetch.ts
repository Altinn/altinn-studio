import type { InfiniteData } from '@tanstack/react-query';
import type { WorkflowCollectionListResponse } from 'admin/features/apps/types/workflows/WorkflowCollection';
import type {
  PersistentItemStatus,
  WorkflowListResponse,
  WorkflowStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';

/**
 * How often an engine-backed view refetches while the engine still has work in flight for what it
 * shows. The ops verbs only enqueue, so the state an operator is waiting for arrives after the
 * verb's own refetch; without this, and with window-focus refetching off, the drill-down and the
 * health column would sit on the stale answer until the operator reloaded.
 */
export const ACTIVE_WORK_REFETCH_INTERVAL_MS = 15_000;

/** While a workflow is being executed or is about to be, its state changes within seconds. */
export const PROCESSING_REFETCH_INTERVAL_MS = 5_000;

/** Floor for any interval, so a backoff that is already due cannot turn into a tight loop. */
export const MIN_REFETCH_INTERVAL_MS = 1_000;

/** Read just after the backoff elapses, not just before: the engine needs a moment to act on it. */
const BACKOFF_GRACE_MS = 1_000;

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

/**
 * When to read the workflow list again, from what it holds now.
 *
 * A workflow in execution is read every few seconds. A parked one is read right after its backoff
 * elapses — the engine tells us when — rather than on a fixed cadence, capped at the usual
 * interval so a change made elsewhere still shows up while a long backoff runs down. Nothing in
 * flight means no polling at all.
 */
export function workflowsRefetchInterval(
  data: Pages<WorkflowListResponse>,
  now: number = Date.now(),
): number | false {
  const workflows = (data?.pages ?? []).flatMap((page) => page?.data ?? []);
  return workflows.reduce<number | false>((interval, workflow) => {
    const candidate = refetchDelayFor(workflow, now);
    if (candidate === false) {
      return interval;
    }
    return interval === false ? candidate : Math.min(interval, candidate);
  }, false);
}

function refetchDelayFor(workflow: WorkflowStatus, now: number): number | false {
  switch (workflow.overallStatus) {
    case 'Enqueued':
    case 'Processing':
      return PROCESSING_REFETCH_INTERVAL_MS;
    case 'Requeued':
    case 'Waiting': {
      const due = workflow.backoffUntil ? new Date(workflow.backoffUntil).getTime() : Number.NaN;
      if (Number.isNaN(due)) {
        return ACTIVE_WORK_REFETCH_INTERVAL_MS;
      }
      return Math.min(
        Math.max(due - now + BACKOFF_GRACE_MS, MIN_REFETCH_INTERVAL_MS),
        ACTIVE_WORK_REFETCH_INTERVAL_MS,
      );
    }
    case 'Held':
      return ACTIVE_WORK_REFETCH_INTERVAL_MS;
    default:
      return false;
  }
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
