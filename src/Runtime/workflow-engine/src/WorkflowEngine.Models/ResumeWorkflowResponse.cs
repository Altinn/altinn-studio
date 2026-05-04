namespace WorkflowEngine.Models;

/// <summary>
/// Response returned from a workflow resume request.
/// </summary>
/// <param name="WorkflowId">Database ID of the resumed workflow.</param>
/// <param name="ResumedAt">When the workflow was resumed.</param>
/// <param name="CascadeResumed">Database IDs of dependent workflows that were resumed alongside the target.</param>
public sealed record ResumeWorkflowResponse(
    Guid WorkflowId,
    DateTimeOffset ResumedAt,
    IReadOnlyList<Guid> CascadeResumed
);
