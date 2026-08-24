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
    /// The registered key of the app command this step runs, carried so the per-command options
    /// resolution (see <c>ProcessStepOptionsResolver</c>) can find the command's own defaults even when
    /// <see cref="OperationId"/> is a display identity rather than the key. Internal and never serialized
    /// — the engine reads the key from the command payload. Null on a step assembled without one, whose
    /// <see cref="OperationId"/> is then the key.
    /// </summary>
    internal string? CommandKey { get; init; }

    /// <summary>
    /// For a service-task pipeline stage: the stage's name, carried so the per-stage options
    /// resolution (see <c>ProcessStepOptionsResolver</c>) can find the matching stage. Internal
    /// and never serialized — the engine sees the stage name only inside the command payload.
    /// </summary>
    internal string? ServiceTaskStageName { get; init; }

    /// <summary>
    /// For a service-task receive step: the stage that opened the exchange the step answers, carried so the
    /// per-handler options resolution (see <c>ProcessStepOptionsResolver</c>) can find the handler that
    /// answers it. Internal and never serialized, like <see cref="ServiceTaskStageName"/>, and never set on
    /// the same step as that one: a step runs a stage or answers an exchange.
    /// </summary>
    internal string? ServiceTaskRepliesTo { get; init; }
}
