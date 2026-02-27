namespace WorkflowEngine.Models;

/// <summary>
/// Server-calculated metadata to accompany a workflow enqueue request.
/// </summary>
/// <param name="InstanceInformation">Information about the instance this request is related to.</param>
/// <param name="Actor">The actor this request was submitted on behalf of.</param>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="TraceContext">The trace context for distributed tracing, if available.</param>
/// <param name="InstanceLockKey">A lock key associated with this workflow request.</param>
public sealed record WorkflowRequestMetadata(
    InstanceInformation InstanceInformation,
    Actor Actor,
    DateTimeOffset CreatedAt,
    string? TraceContext,
    string? InstanceLockKey
);
