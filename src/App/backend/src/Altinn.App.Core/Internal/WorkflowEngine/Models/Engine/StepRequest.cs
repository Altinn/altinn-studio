using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Represents a single step to be processed by the workflow engine.
/// </summary>
internal sealed record StepRequest
{
    /// <summary>
    /// A human-readable identifier for this operation (used in logs, telemetry, and idempotency keys).
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// The command to be executed by the workflow engine.
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

    /// <summary>
    /// For a staged service-task step: the pipeline step's name, carried so the per-step options
    /// resolution (see <c>ProcessStepOptionsResolver</c>) can find the matching
    /// <c>IServiceTaskStep</c>. Internal and never serialized — the engine sees the step name only
    /// inside the command payload.
    /// </summary>
    internal string? ServiceTaskStepName { get; init; }
}
