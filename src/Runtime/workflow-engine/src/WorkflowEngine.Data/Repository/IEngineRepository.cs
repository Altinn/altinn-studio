using WorkflowEngine.Models;

// CA1716: Identifiers should not match keywords (https://github.com/dotnet/roslyn-analyzers/issues/1858)
#pragma warning disable CA1716

namespace WorkflowEngine.Data.Repository;

public interface IEngineRepository
{
    /// <summary>
    /// Gets all active workflows, optionally filtered by namespace.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetActiveWorkflows(string? ns = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all scheduled workflows.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets finished workflows filtered by the specified statuses.
    /// </summary>
    Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
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
    /// Gets finished workflows with a total count of matching rows (single DB slot).
    /// The count ignores the <paramref name="take"/> and <paramref name="before"/> (cursor) parameters.
    /// </summary>
    Task<(IReadOnlyList<Workflow> Workflows, int TotalCount)> GetFinishedWorkflowsWithCount(
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
    /// Gets all distinct values for a given label key across all workflows.
    /// </summary>
    Task<IReadOnlyList<string>> GetDistinctLabelValues(string labelKey, CancellationToken cancellationToken = default);

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
    /// Gets the status of a workflow by its database ID, or null if not found.
    /// </summary>
    Task<PersistentItemStatus?> GetWorkflowStatus(Guid workflowId, CancellationToken cancellationToken = default);

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
    /// Gets the full workflow (with steps) by database ID, or null if not found.
    /// </summary>
    Task<Workflow?> GetWorkflow(Guid workflowId, CancellationToken cancellationToken = default);

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
    /// </summary>
    Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken cancellationToken);

    /// <summary>
    /// Batch-updates multiple workflows and their dirty steps in a single transaction using raw SQL.
    /// </summary>
    Task BatchUpdateWorkflowsAndSteps(
        IReadOnlyList<BatchWorkflowStatusUpdate> updates,
        CancellationToken cancellationToken
    );
}

// TODO: These models should live somewhere else

/// <summary>
/// A single caller's enqueue request waiting in the write buffer.
/// </summary>
public sealed record BufferedEnqueueRequest(
    WorkflowEnqueueRequest Request,
    WorkflowRequestMetadata Metadata,
    byte[] RequestBodyHash,
    TaskCompletionSource<Guid[]> Completion
);

/// <summary>
/// Result of a batch enqueue operation for a single request.
/// </summary>
public sealed record BatchEnqueueResult(
    BatchEnqueueResultStatus Status,
    Guid[]? WorkflowIds,
    string? ErrorMessage = null
)
{
    public static BatchEnqueueResult Created(Guid[] workflowIds) => new(BatchEnqueueResultStatus.Created, workflowIds);

    public static BatchEnqueueResult Duplicate(Guid[] workflowIds) =>
        new(BatchEnqueueResultStatus.Duplicate, workflowIds);

    public static BatchEnqueueResult Conflicted() => new(BatchEnqueueResultStatus.Conflict, null);

    public static BatchEnqueueResult InvalidRef(string message) =>
        new(BatchEnqueueResultStatus.InvalidReference, null, message);
}

public enum BatchEnqueueResultStatus
{
    /// <summary>
    /// New workflows were created.
    /// </summary>
    Created,

    /// <summary>
    /// Idempotency key matched — returning previously stored workflow IDs.
    /// </summary>
    Duplicate,

    /// <summary>
    /// Idempotency key matched but request body hash differs.
    /// </summary>
    Conflict,

    /// <summary>
    /// One or more workflow dependency/link references could not be resolved.
    /// </summary>
    InvalidReference,
}

/// <summary>
/// Result of processing a single workflow (status + optional error).
/// </summary>
public sealed record WorkflowResult(Guid WorkflowId, PersistentItemStatus Status, string? Error);

/// <summary>
/// A single workflow and its dirty steps for batched status persistence.
/// </summary>
public sealed record BatchWorkflowStatusUpdate(Workflow Workflow, IReadOnlyList<Step> DirtySteps);
