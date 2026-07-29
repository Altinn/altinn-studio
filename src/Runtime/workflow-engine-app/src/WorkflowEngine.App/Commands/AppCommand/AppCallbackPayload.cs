using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Payload sent to the Altinn application when an AppCommand is executed.
/// </summary>
internal sealed record AppCallbackPayload
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// How many times this step has been retried after a retryable failure. Reset to <c>0</c> whenever
    /// the step defers, so it counts consecutive failures since the last re-check rather than attempts
    /// across the step's whole life.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public int RetryCount { get; init; }

    /// <summary>
    /// The instant the engine stops waiting for this attempt and treats it as a retryable failure.
    /// </summary>
    [JsonPropertyName("executionDeadline")]
    public DateTimeOffset? ExecutionDeadline { get; init; }

    /// <summary>
    /// How many times this step has already deferred. <c>0</c> on a first execution.
    /// </summary>
    [JsonPropertyName("deferCount")]
    public int DeferCount { get; init; }

    /// <summary>
    /// The absolute instant at which the step's wait budget runs out, or <c>null</c> before its first
    /// deferral (nothing is being waited on yet, so the full budget is still ahead).
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration, which would start aging the moment it is serialized.
    /// </remarks>
    [JsonPropertyName("waitDeadline")]
    public DateTimeOffset? WaitDeadline { get; init; }
}
