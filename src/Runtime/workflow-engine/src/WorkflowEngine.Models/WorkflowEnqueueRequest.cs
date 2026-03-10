using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A request to enqueue one or more workflows in a single batch.
/// </summary>
public sealed record WorkflowEnqueueRequest
{
    /// <summary>
    /// A correlation ID shared by all workflows in this batch.
    /// Used for grouping and looking up related workflows.
    /// </summary>
    [JsonPropertyName("correlationId")]
    public required Guid CorrelationId { get; init; }

    /// <summary>
    /// The actor submitting this batch.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    /// <summary>
    /// An idempotency key for this entire enqueue request (all workflows in the batch).
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    // TODO: This is named 'InstanceLockKey' elsewhere, unify to one or the other
    /// <summary>
    /// Optional instance lock key shared by all workflows in this batch.
    /// </summary>
    [JsonPropertyName("lockToken")]
    public string? LockToken { get; init; }

    /// <summary>
    /// Optional namespace for scoping idempotency and workflow references.
    /// Defaults to "default" when not specified.
    /// </summary>
    [JsonPropertyName("namespace")]
    public string? Namespace { get; init; }

    /// <summary>
    /// The organization that the instance belongs to.
    /// </summary>
    [JsonPropertyName("org")]
    public required string Org { get; init; }

    /// <summary>
    /// The app that created the instance.
    /// </summary>
    [JsonPropertyName("app")]
    public required string App { get; init; }

    /// <summary>
    /// The instance owner's party ID.
    /// </summary>
    [JsonPropertyName("instanceOwnerPartyId")]
    public required int InstanceOwnerPartyId { get; init; }

    /// <summary>
    /// The instance ID.
    /// </summary>
    [JsonPropertyName("instanceGuid")]
    public required Guid InstanceGuid { get; init; }

    /// <summary>
    /// The workflows to enqueue.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowRequest> Workflows { get; init; }

    internal byte[] ComputeHash()
    {
        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(this);
        return SHA256.HashData(jsonBytes);
    }
}
