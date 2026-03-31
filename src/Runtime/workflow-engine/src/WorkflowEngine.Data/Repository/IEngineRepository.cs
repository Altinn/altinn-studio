using WorkflowEngine.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Data.Repository;

internal interface IEngineRepository
{
    /// <summary>
    /// Gets all active workflows, optionally filtered by namespace.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflows(string? ns = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all scheduled workflows, optionally filtered by namespace.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(
        string? ns = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets finished workflows (completed, failed, canceled, dependency-failed).
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queries workflows by status with a total count of matching rows (single DB slot).
    /// The count ignores the <paramref name="take"/> and <paramref name="before"/> (cursor) parameters.
    /// </summary>
    Task<(IReadOnlyList<Workflow> Workflows, int TotalCount)> QueryWorkflowsWithCount(
        IReadOnlyList<PersistentItemStatus> statuses,
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
        string? correlationId = null,
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
    /// Gets the status of a workflow by its database ID and namespace, or null if not found.
    /// </summary>
    Task<PersistentItemStatus?> GetWorkflowStatus(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all active (incomplete) workflows, optionally filtered by correlation ID and namespace.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflowsByCorrelationId(
        Guid? correlationId = null,
        string? ns = null,
        IReadOnlyDictionary<string, string>? labelFilters = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the full workflow (with steps) by database ID and namespace, or null if not found.
    /// </summary>
    Task<Workflow?> GetWorkflow(Guid workflowId, string ns, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a workflow by idempotency key and creation time.
    /// Used by the internal dashboard to resolve step details from SSE-streamed idempotency keys.
    /// This method is cross-namespace by design — only expose it through non-production endpoints.
    /// </summary>
    Task<Workflow?> GetWorkflow(
        string idempotencyKey,
        DateTimeOffset createdAt,
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
    Task<BatchEnqueueResult[]> BatchEnqueueWorkflowsAsync(
        IReadOnlyList<BufferedEnqueueRequest> requests,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Atomically fetches and locks available workflows for processing using FOR UPDATE SKIP LOCKED.
    /// Also reclaims stale workflows stuck in Processing whose heartbeat has expired.
    /// </summary>
    Task<FetchResult> FetchAndLockWorkflows(
        int count,
        TimeSpan staleThreshold,
        int maxReclaimCount,
        CancellationToken cancellationToken
    );

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
    /// Used by <see cref="WorkflowEngine.Core.CancellationWatcherService"/> for cross-pod cancellation propagation.
    /// </summary>
    Task<IReadOnlyList<Guid>> GetPendingCancellations(
        IReadOnlyList<Guid> inFlightIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Batch-updates HeartbeatAt for all specified workflow IDs in a single statement.
    /// Used by the processor to prove liveness of in-flight workers.
    /// </summary>
    Task BatchUpdateHeartbeats(IReadOnlyList<Guid> workflowIds, CancellationToken cancellationToken);

    /// <summary>
    /// Batch-updates multiple workflows and their dirty steps in a single transaction using raw SQL.
    /// </summary>
    Task BatchUpdateWorkflowsAndSteps(
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
}
