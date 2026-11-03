using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A single step of a workflow, to be processed by the workflow engine.
/// </summary>
public sealed record StepRequest
{
    /// <summary>
    /// A human-readable identifier for this operation (used in logs, telemetry, and idempotency keys).
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// The command the step runs.
    /// </summary>
    [JsonPropertyName("command")]
    public required CommandDefinition Command { get; init; }

    /// <summary>
    /// An optional retry strategy for the step. If none given, the default strategy will be used.
    /// </summary>
    [JsonPropertyName("retryStrategy")]
    public RetryStrategy? RetryStrategy { get; init; }

    /// <summary>
    /// Optional key-value labels for this step. Stored and returned but not queryable.
    /// </summary>
    [JsonPropertyName("labels")]
    public Dictionary<string, string>? Labels { get; init; }
}
