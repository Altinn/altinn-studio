namespace WorkflowEngine.Models;

/// <summary>
/// Response returned when a parked workflow was failed by the caller.
/// </summary>
/// <param name="WorkflowId">Database ID of the failed workflow.</param>
/// <param name="FailedAt">When the failure was recorded — the timestamp of the step's final error entry.</param>
public sealed record FailWorkflowResponse(Guid WorkflowId, DateTimeOffset FailedAt);
