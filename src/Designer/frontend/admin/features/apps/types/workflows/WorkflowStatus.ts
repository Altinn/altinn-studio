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
  | 'Waiting';

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

export type WorkflowListResponse = {
  data: WorkflowStatus[];
  pageSize: number;
  totalCount: number;
  /** Cursor for the next page. Null/absent on the last page. */
  nextCursor?: string | null;
};
