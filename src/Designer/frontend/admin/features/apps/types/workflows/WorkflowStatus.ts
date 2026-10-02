/**
 * Wire types for the workflow-engine workflow reads exposed by Designer's admin API
 * (`designer/api/v1/admin/workflows/{org}/{env}/{app}/workflows`). Designer passes the engine DTOs
 * through unmodified, so these mirror the engine's camelCase JSON. Only the fields this UI consumes
 * are typed.
 */

/** Lifecycle status shared by workflows and steps. Serialized by the engine as its PascalCase name. */
export type PersistentItemStatus =
  | 'Enqueued'
  | 'Processing'
  | 'Requeued'
  | 'Completed'
  | 'Failed'
  | 'Canceled'
  | 'DependencyFailed'
  | 'Abandoned'
  | 'Waiting'
  /** Parked on a mailbox until its message arrives or the mailbox closes. Non-terminal. */
  | 'Held';

/**
 * Unsuccessfully terminal statuses. `Abandoned` is excluded: it is the engine's adjudication marker
 * for a failure that has already been written off, so it is settled rather than failing.
 */
export const FAILED_WORKFLOW_STATUSES: readonly PersistentItemStatus[] = [
  'Failed',
  'Canceled',
  'DependencyFailed',
];

/** A terminal status the ops verbs can act on: the failed set, plus an already written-off failure. */
export const RESUMABLE_WORKFLOW_STATUSES: readonly PersistentItemStatus[] = [
  ...FAILED_WORKFLOW_STATUSES,
  'Abandoned',
];

/**
 * Parked on a timer: the engine tries again when the backoff elapses. Both can be run now
 * (nudged) instead of waiting, or given up on (failed) instead of waiting the retries out. `Held`
 * is parked too, but on a mailbox rather than a timer, so neither verb applies to it.
 */
export const PARKED_WORKFLOW_STATUSES: readonly PersistentItemStatus[] = ['Requeued', 'Waiting'];

export type WorkflowErrorEntry = {
  timestamp: string;
  message: string;
  httpStatusCode?: number | null;
  wasRetryable: boolean;
};

export type WorkflowStepStatus = {
  databaseId: string;
  operationId: string;
  processingOrder: number;
  status: PersistentItemStatus;
  command: { type: string };
  /** Times the step has been requeued after a failure. */
  retryCount: number;
  /** When a worker last started executing the step. Absent until the first attempt. */
  executionStartedAt?: string;
  /** Times the step has parked in Waiting because the awaited outcome was not available yet. */
  deferCount?: number;
  updatedAt?: string;
  firstDeferredAt?: string;
  /** The deferring command's own words for what it is waiting for. */
  lastDeferReason?: string;
  errorHistory?: WorkflowErrorEntry[];
};

export type WorkflowStatus = {
  databaseId: string;
  /** The bare instance GUID for workflows enqueued by the app runtime. */
  collectionKey?: string;
  operationId: string;
  idempotencyKey: string;
  namespace: string;
  createdAt: string;
  updatedAt?: string;
  /** When a worker last started executing the workflow. Absent until the first attempt. */
  executionStartedAt?: string;
  /**
   * When a parked (`Requeued`/`Waiting`) workflow is due again. Cleared once the engine picks it up,
   * so a value in the past means the next attempt is imminent, not overdue.
   */
  backoffUntil?: string | null;
  overallStatus: PersistentItemStatus;
  /**
   * The head-visibility directive the workflow was enqueued with. `false` marks a workflow
   * deliberately invisible to collection head tracking (a non-blocking side chain); absent means
   * natural leaf detection applied.
   */
  isHead?: boolean;
  labels?: Record<string, string>;
  steps: WorkflowStepStatus[];
};

/** What `POST …/workflows/{id}/resume` answers with. */
export type ResumeWorkflowResponse = {
  workflowId: string;
  resumedAt: string;
  /** Dependents left in `DependencyFailed` by this workflow that the cascade resumed with it. */
  cascadeResumed: string[];
};

export type WorkflowListResponse = {
  data: WorkflowStatus[];
  pageSize: number;
  totalCount: number;
  /** Cursor for the next page. Null/absent on the last page. */
  nextCursor?: string | null;
};
