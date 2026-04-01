namespace WorkflowEngine.Models;

/// <summary>
/// Server-computed metadata to accompany a workflow enqueue request.
/// Carries fields extracted from HTTP headers/query params alongside server-generated values.
/// </summary>
/// <param name="Namespace">Isolation boundary. Always resolved — defaults to "default".</param>
/// <param name="IdempotencyKey">Idempotency key for deduplication (unique within namespace).</param>
/// <param name="CorrelationId">Optional correlation ID shared by all workflows in the batch.</param>
/// <param name="CreatedAt">The time this request was created (eg. now).</param>
/// <param name="TraceContext">The trace context for distributed tracing, if available.</param>
public sealed record WorkflowRequestMetadata(
    string Namespace,
    string IdempotencyKey,
    Guid? CorrelationId,
    DateTimeOffset CreatedAt,
    string? TraceContext
);
