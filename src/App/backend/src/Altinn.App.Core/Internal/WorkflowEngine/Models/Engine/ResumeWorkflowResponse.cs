namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Response from the workflow engine resume endpoint.
/// </summary>
internal sealed record ResumeWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset ResumedAt,
    IReadOnlyList<Guid> CascadeResumed
);
