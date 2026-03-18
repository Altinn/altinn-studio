using WorkflowEngine.Data.Repository;

namespace WorkflowEngine.Data;

/// <summary>
/// The outcome of a single enqueue request, returned to the caller via the write buffer.
/// </summary>
public sealed record WorkflowEnqueueOutcome(Guid[] WorkflowIds, BatchEnqueueResultStatus Status);
