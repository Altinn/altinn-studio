using WorkflowEngine.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Data.Repository;

internal interface IEngineRepository
{
    /// <summary>
    /// Gets active workflows with cursor-based pagination.
    /// Results are ordered by ID (UUIDv7 = chronological). Pass the <paramref name="cursor"/> from
    /// <see cref="CursorPaginatedResult.NextCursor"/> to fetch the next page.
    /// Set <paramref name="includeTotalCount"/> to true to include the total count (adds a COUNT query).
    /// </summary>
    Task<CursorPaginatedResult> GetActiveWorkflows(
        int pageSize,
        Guid? cursor = null,
        bool includeTotalCount = false,
        string? collectionKey = null,
        string? ns = null,
        IReadOnlyDictionary<string, string>? labelFilters = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets scheduled workflows with cursor-based pagination.
    /// Results are ordered by ID (UUIDv7 = chronological). Pass the <paramref name="cursor"/> from
    /// <see cref="CursorPaginatedResult.NextCursor"/> to fetch the next page.
    /// </summary>
    Task<CursorPaginatedResult> GetScheduledWorkflows(
        int pageSize,
        Guid? cursor = null,
        string? ns = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queries workflows by status with cursor-based pagination (ID DESC = newest first).
    /// Replaces both <c>GetFinishedWorkflows</c> and <c>QueryWorkflowsWithCount</c>.
    /// Set <paramref name="includeTotalCount"/> to true to include the total count (adds a COUNT query).
    /// </summary>
    Task<CursorPaginatedResult> QueryWorkflows(
        int pageSize,
        IReadOnlyCollection<PersistentItemStatus> statuses,
        Guid? cursor = null,
        bool includeTotalCount = false,
        string? search = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
        string? collectionKey = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets distinct values for a given label key, optionally filtered by namespace.
    /// </summary>
    Task<IReadOnlyList<string>> GetDistinctLabelValues(
        string labelKey,
        string? ns = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all distinct namespace values across all workflows, ordered alphabetically.
    /// </summary>
    Task<IReadOnlyList<string>> GetDistinctNamespaces(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of active workflows.
    /// </summary>
    Task<int> CountActiveWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of scheduled workflows.
    /// </summary>
    Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of failed workflows.
    /// </summary>
    Task<int> CountFailedWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the number of successfully completed workflows.
    /// </summary>
    Task<int> CountSuccessfulWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets workflow counts grouped by status in a single query, plus a separate count
    /// of scheduled workflows (enqueued with <c>StartAt</c> in the future).
    /// Uses an index-only scan on <c>IX_Workflows_Status</c> — much cheaper than
    /// running individual count queries with joins and subqueries.
    /// </summary>
    Task<WorkflowStatusCounts> CountWorkflowsByStatus(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the status of a workflow by its database ID and namespace, or null if not found.
    /// </summary>
    Task<PersistentItemStatus?> GetWorkflowStatus(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the full workflow (with steps) by database ID and namespace, or null if not found.
    /// </summary>
    Task<Workflow?> GetWorkflow(Guid workflowId, string ns, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the root workflow plus every workflow it can reach — directly or transitively,
    /// upstream or downstream — through dependency or link relations within <paramref name="ns"/>.
    /// Each returned <see cref="Workflow"/> has its steps, dependencies, dependents, and links
    /// eagerly loaded. Ordered by <c>CreatedAt</c>, then <c>Id</c>. Returns <c>null</c> if the
    /// root workflow does not exist in the given namespace.
    /// </summary>
    Task<IReadOnlyList<Workflow>?> GetWorkflowDependencyGraph(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates a workflow in the repository.
    /// </summary>
    Task UpdateWorkflow(Workflow workflow, bool updateTimestamp = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the specified step in the workflow repository.
    /// </summary>
    Task UpdateStep(Step step, bool updateTimestamp = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Batch-enqueues workflows with idempotency checking, COPY BINARY bulk insert, and dependency validation.
    /// </summary>
    Task<BatchEnqueueResult[]> BatchEnqueueWorkflows(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Atomically fetches and locks available workflows for processing using FOR UPDATE SKIP LOCKED.
    /// Stale workflow reclaim and poison abandonment run as separate sweeps in
    /// <c>DbMaintenanceService</c>; reclaimed rows re-enter this fetch as <c>Enqueued</c>.
    /// </summary>
    Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken cancellationToken);

    /// <summary>
    /// Sets the <c>CancellationRequestedAt</c> flag on a workflow.
    /// Only affects workflows that are not already in a terminal state and not already flagged for cancellation.
    /// Returns true if the workflow was found and updated.
    /// </summary>
    Task<bool> RequestCancellation(
        Guid workflowId,
        string ns,
        DateTimeOffset requestedAt,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the status and cancellation timestamp for a workflow, or null if the workflow does not exist.
    /// Used by the cancel endpoint to distinguish "already cancelling" from "already terminal" and "not found".
    /// </summary>
    Task<WorkflowCancellationInfo?> GetCancellationInfo(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns the subset of <paramref name="inFlightIds"/> that have a non-null <c>CancellationRequestedAt</c>.
    /// Used by <c>WorkflowEngine.Core.CancellationWatcherService</c> for cross-pod cancellation propagation.
    /// </summary>
    Task<IReadOnlyList<Guid>> GetPendingCancellations(
        IReadOnlyList<Guid> inFlightIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Batch-updates HeartbeatAt for all specified workflow leases in a single statement.
    /// Used by the processor to prove liveness of in-flight workers.
    /// Skips workflows whose <c>UpdatedAt</c> is newer than <paramref name="staleThreshold"/> —
    /// a recent status write already proves liveness.
    /// Rows are only updated when the caller's <c>LeaseToken</c> matches the current value on the row;
    /// stale-token heartbeats silently no-op so a reclaimed row goes back to <c>HeartbeatAt</c> aging
    /// and remains stale-recoverable.
    /// </summary>
    Task BatchUpdateHeartbeats(
        IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)> leases,
        TimeSpan staleThreshold,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Batch-updates multiple workflows and their dirty steps in a single transaction using raw SQL.
    /// Each workflow is only written when its <c>LeaseToken</c> still matches the value on the row —
    /// workflows that have been reclaimed by another host are silently rejected and their step updates
    /// are skipped. Returns the accepted/rejected split; callers should fault the corresponding
    /// submit-waiters with <c>LeaseLostException</c> on rejected ids.
    /// </summary>
    Task<BatchUpdateResult> BatchUpdateWorkflowsAndSteps(
        IReadOnlyList<BatchWorkflowStatusUpdate> updates,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Resumes a terminal workflow (Failed, Canceled, DependencyFailed) or a Requeued workflow by resetting it and
    /// its non-completed steps back to Enqueued. Clears CancellationRequestedAt, BackoffUntil,
    /// HeartbeatAt, and ReclaimCount. When <paramref name="cascade"/> is true, also resumes
    /// any transitively dependent workflows that are in DependencyFailed state.
    /// Returns the list of all resumed workflow IDs (primary + cascaded), or empty if
    /// the target workflow was not in a resumable state.
    /// </summary>
    Task<IReadOnlyList<Guid>> ResumeWorkflow(
        Guid workflowId,
        string ns,
        DateTimeOffset resumedAt,
        bool cascade = false,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Clears BackoffUntil on a requeued workflow so it resumes retrying immediately.
    /// Returns true if the workflow was found, is Requeued, and had a non-null BackoffUntil.
    /// </summary>
    Task<bool> SkipBackoff(Guid workflowId, string ns, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all workflow collections in a namespace.
    /// </summary>
    Task<IReadOnlyList<WorkflowCollectionResponse>> GetCollections(
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a single workflow collection by key and namespace, including head workflow statuses.
    /// </summary>
    Task<WorkflowCollectionDetailResponse?> GetCollection(
        string key,
        string ns,
        CancellationToken cancellationToken = default
    );
}
