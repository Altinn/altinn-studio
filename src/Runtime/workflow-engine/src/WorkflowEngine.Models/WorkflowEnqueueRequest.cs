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
    /// Primary isolation boundary. Idempotency keys are unique within a tenant.
    /// </summary>
    [JsonPropertyName("tenantId")]
    public required string TenantId { get; init; }

    /// <summary>
    /// An idempotency key for this entire enqueue request (all workflows in the batch).
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// Indexed key-value pairs for filtering, grouping, and dashboard queries.
    /// Applied to all workflows in this batch.
    /// </summary>
    [JsonPropertyName("labels")]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Opaque context passed to command handlers at execution time.
    /// Applied to all workflows in this batch. The engine never inspects this.
    /// </summary>
    [JsonPropertyName("context")]
    public JsonElement? Context { get; init; }

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
