namespace WorkflowEngine.Models;

/// <summary>
/// Response returned from a workflow cancellation request.
/// </summary>
/// <param name="WorkflowId">Database ID of the workflow that was targeted.</param>
/// <param name="CancellationRequestedAt">When the cancellation was recorded.</param>
/// <param name="CanceledImmediately">
/// <c>true</c> when the workflow was actively executing on the pod that received the request, so its
/// cancellation token was triggered synchronously (in-process) before this response returned.
/// <c>false</c> when the cancellation was recorded but the workflow was not running on this pod — it is
/// either still queued or running on another pod, and will be canceled via the distributed path. In all
/// cases the cancellation is durably recorded and guaranteed to take effect.
/// </param>
public sealed record CancelWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset CancellationRequestedAt,
    bool CanceledImmediately
);
