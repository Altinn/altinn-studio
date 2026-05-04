namespace WorkflowEngine.Core.Metadata;

/// <summary>
/// Metadata extracted from inbound HTTP headers and/or query parameters.
/// </summary>
internal sealed record InboundMetadata(string Namespace, string IdempotencyKey, string? CollectionKey);
