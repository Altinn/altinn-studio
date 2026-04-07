namespace WorkflowEngine.Core;

internal abstract record CancelWorkflowResult
{
    private CancelWorkflowResult() { }

    /// <summary>
    /// Cancellation request accepted and applied.
    /// </summary>
    internal sealed record Requested(Guid WorkflowId, DateTimeOffset CancellationRequestedAt, bool CanceledImmediately)
        : CancelWorkflowResult;

    /// <summary>
    /// Cancellation was already requested (idempotent).
    /// </summary>
    internal sealed record AlreadyRequested(Guid WorkflowId, DateTimeOffset CancellationRequestedAt)
        : CancelWorkflowResult;

    /// <summary>
    /// Workflow not found.
    /// </summary>
    internal sealed record NotFound : CancelWorkflowResult;

    /// <summary>
    /// Workflow is already in a terminal state.
    /// </summary>
    internal sealed record TerminalState : CancelWorkflowResult;
}
