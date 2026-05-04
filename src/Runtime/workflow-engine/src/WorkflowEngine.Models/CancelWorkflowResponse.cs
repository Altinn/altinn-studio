namespace WorkflowEngine.Models;

/// <summary>
/// Response returned from a workflow cancellation request.
/// </summary>
/// <param name="WorkflowId">Database ID of the workflow that was targeted.</param>
/// <param name="CancellationRequestedAt">When the cancellation was recorded.</param>
/// <param name="CanceledImmediately">
/// <c>true</c> when the workflow was already in a non-running state and could be canceled in-place,
/// <c>false</c> when cancellation has been requested but is still propagating to the active worker.
/// </param>
public sealed record CancelWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset CancellationRequestedAt,
    bool CanceledImmediately
);
