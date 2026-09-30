namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Response from the workflow engine cancel endpoint.
/// </summary>
internal sealed record CancelWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset CancellationRequestedAt,
    bool CanceledImmediately
);
