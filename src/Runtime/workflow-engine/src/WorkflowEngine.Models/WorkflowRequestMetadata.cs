namespace WorkflowEngine.Models;

/// <summary>
/// Server-computed metadata to accompany a workflow enqueue request.
/// </summary>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="TraceContext">The trace context for distributed tracing, if available.</param>
public sealed record WorkflowRequestMetadata(DateTimeOffset CreatedAt, string? TraceContext);
