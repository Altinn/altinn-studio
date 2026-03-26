namespace WorkflowEngine.Core.Metadata;

/// <summary>
/// Metadata extracted from inbound HTTP headers and/or query parameters.
/// </summary>
internal sealed record InboundMetadata(
    /// <summary>
    /// Namespace for isolation boundary. Always resolved — defaults to "default".
    /// </summary>
    string Namespace,
    /// <summary>
    /// Idempotency key for deduplication. Required on enqueue, null on other endpoints.
    /// </summary>
    string? IdempotencyKey,
    /// <summary>
    /// Optional correlation ID for grouping related workflows.
    /// </summary>
    Guid? CorrelationId
);
