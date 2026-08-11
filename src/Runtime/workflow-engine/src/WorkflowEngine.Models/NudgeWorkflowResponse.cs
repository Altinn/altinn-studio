namespace WorkflowEngine.Models;

/// <summary>
/// Response returned from a workflow nudge request.
/// </summary>
/// <param name="WorkflowId">Database ID of the nudged workflow.</param>
/// <param name="NudgedAt">When the pending backoff was cleared. Null when the workflow was already runnable.</param>
public sealed record NudgeWorkflowResponse(Guid WorkflowId, DateTimeOffset? NudgedAt);
