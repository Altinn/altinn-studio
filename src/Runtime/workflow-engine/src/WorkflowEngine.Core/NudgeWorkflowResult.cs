using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

internal abstract record NudgeWorkflowResult
{
    private NudgeWorkflowResult() { }

    /// <summary>
    /// The pending backoff was cleared, so the workflow is runnable immediately.
    /// </summary>
    internal sealed record Nudged(Guid WorkflowId, DateTimeOffset NudgedAt) : NudgeWorkflowResult;

    /// <summary>
    /// The workflow was already runnable (no pending backoff) — an idempotent replay, since the
    /// nudge's goal state already holds.
    /// </summary>
    internal sealed record AlreadyRunnable(Guid WorkflowId) : NudgeWorkflowResult;

    /// <summary>
    /// Workflow not found.
    /// </summary>
    internal sealed record NotFound : NudgeWorkflowResult;

    /// <summary>
    /// The workflow holds no backoff to skip: it is not parked in
    /// <see cref="PersistentItemStatus.Requeued"/> or <see cref="PersistentItemStatus.Waiting"/>.
    /// </summary>
    internal sealed record NotParked(PersistentItemStatus CurrentStatus) : NudgeWorkflowResult;
}
