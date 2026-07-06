using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

internal abstract record AbandonWorkflowResult
{
    private AbandonWorkflowResult() { }

    /// <summary>
    /// Workflow was marked <see cref="PersistentItemStatus.Abandoned"/>.
    /// </summary>
    internal sealed record Abandoned(Guid WorkflowId, DateTimeOffset AbandonedAt) : AbandonWorkflowResult;

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
