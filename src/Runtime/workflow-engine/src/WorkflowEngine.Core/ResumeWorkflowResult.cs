using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

internal abstract record ResumeWorkflowResult
{
    private ResumeWorkflowResult() { }

    /// <summary>
    /// Workflow was resumed successfully.
    /// </summary>
    internal sealed record Resumed(Guid WorkflowId, DateTimeOffset ResumedAt, IReadOnlyList<Guid> CascadeResumed)
        : ResumeWorkflowResult;

    /// <summary>
    /// Workflow not found.
    /// </summary>
    internal sealed record NotFound : ResumeWorkflowResult;

    /// <summary>
    /// Workflow is not in a resumable state.
    /// </summary>
    internal sealed record NotResumable(PersistentItemStatus CurrentStatus) : ResumeWorkflowResult;
}
