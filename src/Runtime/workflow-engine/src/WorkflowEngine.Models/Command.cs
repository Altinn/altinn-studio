using System.Text.Json;
using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Describes a command to be executed by the workflow engine.
/// The engine stores and routes commands but does not interpret them —
/// a registered <see cref="ICommandHandler"/> handles execution.
/// </summary>
public sealed record Command
{
    /// <summary>
    /// The command type discriminator. Matched against registered command handlers.
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    /// <summary>
    /// A human-readable identifier for this operation (used in logs, telemetry, and idempotency keys).
    /// </summary>
    [JsonPropertyName("operationId")]
    public required string OperationId { get; init; }

    /// <summary>
    /// The maximum allowed execution time for the command.
    /// If the command does not complete within this time, it will be considered failed.
    /// </summary>
    [JsonPropertyName("maxExecutionTime")]
    public TimeSpan? MaxExecutionTime { get; init; }

    /// <summary>
    /// Opaque command configuration. The engine never inspects this —
    /// the matching <see cref="ICommandHandler"/> deserializes it.
    /// </summary>
    [JsonPropertyName("data")]
    public JsonElement? Data { get; init; }

    /// <inheritdoc/>
    public override string ToString() => $"{Type}:{OperationId}";
}
