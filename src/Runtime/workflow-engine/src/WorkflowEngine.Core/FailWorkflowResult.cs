using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

internal abstract record FailWorkflowResult
{
    private FailWorkflowResult() { }

    /// <summary>
    /// This call moved the parked workflow to <see cref="PersistentItemStatus.Failed"/>.
    /// </summary>
    internal sealed record Failed(Guid WorkflowId, DateTimeOffset FailedAt) : FailWorkflowResult;

    /// <summary>
    /// Workflow not found.
    /// </summary>
    internal sealed record NotFound : FailWorkflowResult;

    /// <summary>
    /// The workflow is not parked in <see cref="PersistentItemStatus.Requeued"/> or
    /// <see cref="PersistentItemStatus.Waiting"/>, so there is nothing to give up on. Includes the race
    /// where the fetch gate claimed the workflow before the compare-and-set landed.
    /// </summary>
    internal sealed record NotParked(PersistentItemStatus CurrentStatus) : FailWorkflowResult;

    /// <summary>
    /// The reason is blank or longer than <see cref="FailWorkflowRequest.MaxReasonLength"/>. Nothing was changed.
    /// </summary>
    internal sealed record Invalid(string Message) : FailWorkflowResult;
}
