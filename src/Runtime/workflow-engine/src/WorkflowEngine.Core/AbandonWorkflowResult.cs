using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

internal abstract record AbandonWorkflowResult
{
    private AbandonWorkflowResult() { }

    /// <summary>
    /// This call marked the workflow <see cref="PersistentItemStatus.Abandoned"/> (the effecting call).
    /// </summary>
    internal sealed record Abandoned(Guid WorkflowId, DateTimeOffset AbandonedAt) : AbandonWorkflowResult;

    /// <summary>
    /// Workflow was already <see cref="PersistentItemStatus.Abandoned"/> by an earlier call (idempotent replay).
    /// Reports the original abandonment timestamp rather than the replay time.
    /// </summary>
    internal sealed record AlreadyAbandoned(Guid WorkflowId, DateTimeOffset AbandonedAt) : AbandonWorkflowResult;

    /// <summary>
    /// Workflow not found.
    /// </summary>
    internal sealed record NotFound : AbandonWorkflowResult;

    /// <summary>
    /// Workflow is not in an abandonable state (only Failed, Canceled and DependencyFailed are).
    /// Includes the race where a concurrent resume revived the workflow before the compare-and-set landed.
    /// </summary>
    internal sealed record NotAbandonable(PersistentItemStatus CurrentStatus) : AbandonWorkflowResult;
}
