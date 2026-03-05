using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

public interface IEngineNpgsqlRepository
{
    Task<BatchEnqueueResult[]> BatchEnqueueWorkflowsAsync(List<BufferedEnqueueRequest> requests, CancellationToken ct);

    Task<List<Workflow>> FetchAndLockWorkflows(int count, CancellationToken ct);

    Task BatchUpdateWorkflowStatuses(List<WorkflowResult> results, CancellationToken ct);

    Task BatchUpdateWorkflowAndSteps(Workflow workflow, IReadOnlyList<Step> steps, CancellationToken ct);

    Task BatchUpdateWorkflowsAndSteps(List<BatchWorkflowStatusUpdate> updates, CancellationToken ct);
}

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
    /// <summary>New workflows were created.</summary>
    Created,

    /// <summary>Idempotency key matched — returning previously stored workflow IDs.</summary>
    Duplicate,

    /// <summary>Idempotency key matched but request body hash differs.</summary>
    Conflict,

    /// <summary>One or more workflow dependency/link references could not be resolved.</summary>
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
