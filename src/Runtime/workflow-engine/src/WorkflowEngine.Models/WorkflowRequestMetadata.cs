namespace WorkflowEngine.Models;

/// <summary>
/// Server-computed metadata to accompany a workflow enqueue request.
/// </summary>
/// <param name="CorrelationId">Optional correlation ID shared by all workflows in the batch.</param>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="TraceContext">The trace context for distributed tracing, if available.</param>
public sealed record WorkflowRequestMetadata(Guid? CorrelationId, DateTimeOffset CreatedAt, string? TraceContext);
