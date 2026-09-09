namespace WorkflowEngine.Models;

/// <summary>
/// Response returned from a workflow skip request.
/// </summary>
/// <param name="WorkflowId">Database ID of the skipped workflow.</param>
/// <param name="SkippedAt">When the workflow was skipped.</param>
public sealed record SkipWorkflowResponse(Guid WorkflowId, DateTimeOffset SkippedAt);
