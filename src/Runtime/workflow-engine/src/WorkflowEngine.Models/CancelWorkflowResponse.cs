namespace WorkflowEngine.Models;

public sealed record CancelWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset CancellationRequestedAt,
    bool CanceledImmediately
);
