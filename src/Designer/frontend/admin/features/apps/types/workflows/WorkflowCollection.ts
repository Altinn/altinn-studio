/**
 * Wire types for the workflow-engine collection reads exposed by Designer's admin API
 * (`designer/api/v1/admin/workflows/{org}/{env}/{app}/collections`). Designer passes the engine
 * DTOs through unmodified, so these mirror the engine's camelCase JSON. Only the fields this UI
 * consumes are typed.
 *
 * A collection key is the bare instance GUID: the app runtime enqueues every process transition
 * under `collectionKey = instanceGuid` in the namespace `{org}/{app}`.
 */

/**
 * Per-collection status rollup. There is deliberately no "settled" bucket — settled workflows are
 * the remainder `total - active - failedVisible - failedInvisible`.
 */
export type CollectionWorkflowCounts = {
  /** Workflows in a non-terminal status (Enqueued, Processing, Requeued, Waiting, Held). */
  active: number;
  /** Failed workflows visible to the head frontier: the process itself is stuck. */
  failedVisible: number;
  /** Failed workflows enqueued with `isHead = false`: side effects lost, process unaffected. */
  failedInvisible: number;
  /** Every workflow in the collection, regardless of status or visibility. */
  total: number;
};

export type WorkflowCollection = {
  /** The bare instance GUID. */
  key: string;
  /** `{org}/{app}`. */
  namespace: string;
  createdAt: string;
  updatedAt?: string;
  /**
   * Absent only on an engine older than the rollup (additive wire contract). Treated as "no data"
   * rather than "healthy" — see `deriveWorkflowHealth`.
   */
  workflowCounts?: CollectionWorkflowCounts;
};

export type WorkflowCollectionListResponse = {
  data: WorkflowCollection[];
  pageSize: number;
  totalCount: number;
  /** Opaque cursor for the next page. Null/absent on the last page. Never parse or construct it. */
  nextCursor?: string | null;
  /**
   * Requested keys with no collection row, populated only in annotate mode (`?key=`). An unmatched
   * key means the engine has no data for that instance — a pre-v9 app, an instance with no
   * transition activity, or data already pruned by retention. It never means "no failures".
   */
  unmatchedKeys?: string[];
};

/** Values accepted by the collections discovery filter (`?failures=`). */
export type CollectionFailureFilter = 'any' | 'visible' | 'invisible';
