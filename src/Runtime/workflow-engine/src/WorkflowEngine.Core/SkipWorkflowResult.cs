using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

internal abstract record SkipWorkflowResult
{
    private SkipWorkflowResult() { }

    /// <summary>
    /// This call moved the workflow to <see cref="PersistentItemStatus.Skipped"/> (the effecting call).
    /// </summary>
    internal sealed record Skipped(Guid WorkflowId, DateTimeOffset SkippedAt) : SkipWorkflowResult;

    /// <summary>
    /// Workflow was already <see cref="PersistentItemStatus.Skipped"/>, by an earlier call or by a command's
    /// skip outcome (idempotent replay). Reports the original skip timestamp rather than the replay time.
    /// </summary>
    internal sealed record AlreadySkipped(Guid WorkflowId, DateTimeOffset SkippedAt) : SkipWorkflowResult;

    /// <summary>
    /// Workflow not found.
    /// </summary>
    internal sealed record NotFound : SkipWorkflowResult;

    /// <summary>
    /// Workflow is not in a skippable state (only Failed, Canceled and DependencyFailed are).
    /// Includes the race where a concurrent resume revived the workflow before the compare-and-set landed.
    /// </summary>
    internal sealed record NotSkippable(PersistentItemStatus CurrentStatus) : SkipWorkflowResult;

    /// <summary>
    /// The reason is longer than <see cref="SkipWorkflowRequest.MaxReasonLength"/>. Nothing was changed.
    /// </summary>
    internal sealed record Invalid(string Message) : SkipWorkflowResult;
}
