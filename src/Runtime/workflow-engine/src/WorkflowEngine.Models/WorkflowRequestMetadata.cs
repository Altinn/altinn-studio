namespace WorkflowEngine.Models;

/// <summary>
/// Server-calculated metadata to accompany a workflow enqueue request.
/// </summary>
/// <param name="CorrelationId">Optional correlation ID shared by all workflows in the batch.</param>
/// <param name="InstanceInformation">Information about the instance this request is related to.</param>
/// <param name="Actor">The actor this request was submitted on behalf of.</param>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="TraceContext">The trace context for distributed tracing, if available.</param>
/// <param name="InstanceLockKey">A lock key associated with this workflow request.</param>
/// <param name="Namespace">The namespace for scoping idempotency and workflow references.</param>
public sealed record WorkflowRequestMetadata(
    Guid? CorrelationId,
    InstanceInformation InstanceInformation,
    Actor Actor,
    DateTimeOffset CreatedAt,
    string? TraceContext,
    string? InstanceLockKey,
    string Namespace
);
