using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A request to enqueue one or more workflows in a single batch.
/// </summary>
public sealed record WorkflowEnqueueRequest
{
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
    /// The workflows to enqueue.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowRequest> Workflows { get; init; }
}
