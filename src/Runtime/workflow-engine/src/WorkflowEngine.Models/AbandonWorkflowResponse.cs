namespace WorkflowEngine.Models;

/// <summary>
/// Response returned from a workflow abandon request.
/// </summary>
/// <param name="WorkflowId">Database ID of the abandoned workflow.</param>
/// <param name="AbandonedAt">When the workflow was abandoned.</param>
public sealed record AbandonWorkflowResponse(Guid WorkflowId, DateTimeOffset AbandonedAt);
