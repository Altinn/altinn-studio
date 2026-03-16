using WorkflowEngine.Data.Repository;

namespace WorkflowEngine.Data;

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
