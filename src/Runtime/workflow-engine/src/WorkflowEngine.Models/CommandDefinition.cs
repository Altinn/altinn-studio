using System.Text.Json;
using System.Text.Json.Serialization;
using WorkflowEngine.Models.Abstractions;

namespace WorkflowEngine.Models;

/// <summary>
/// Describes a command to be executed by the workflow engine.
/// The engine stores and routes commands but does not interpret them —
/// a registered <see cref="ICommand"/> handles execution.
/// </summary>
public sealed record CommandDefinition
{
    /// <summary>
    /// Shared <see cref="JsonSerializerOptions"/> for command data and workflow context serialization.
    /// Used by the engine (validation + execution) and by command descriptors for response parsing.
    /// </summary>
    public static readonly JsonSerializerOptions SerializerOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// The command type discriminator. Matched against registered command handlers.
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    /// <summary>
    /// The maximum allowed execution time for the command.
    /// If the command does not complete within this time, it will be considered failed.
    /// </summary>
    [JsonPropertyName("maxExecutionTime")]
    public TimeSpan? MaxExecutionTime { get; init; }

    /// <summary>
    /// The maximum total wall-clock time the step may spend in <see cref="PersistentItemStatus.Waiting"/>
    /// across deferrals (<see cref="ExecutionResult.Defer"/>) before the engine fails it.
    /// Measured from when the step first became runnable. When <c>null</c>,
    /// <see cref="EngineSettings.DefaultStepWaitDuration"/> applies.
    /// </summary>
    [JsonPropertyName("maxWaitDuration")]
    public TimeSpan? MaxWaitDuration { get; init; }

    /// <summary>
    /// Command configuration. The engine deserializes this into the type
    /// declared by the matching <see cref="ICommand.CommandDataType"/>.
    /// </summary>
    [JsonPropertyName("data")]
    public JsonElement? Data { get; init; }

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> with typed data, serialized via <see cref="SerializerOptions"/>.
    /// </summary>
    public static CommandDefinition Create<TData>(
        string type,
        TData data,
        TimeSpan? maxExecutionTime = null,
        TimeSpan? maxWaitDuration = null
    )
        where TData : class =>
        new()
        {
            Type = type,
            MaxExecutionTime = maxExecutionTime,
            MaxWaitDuration = maxWaitDuration,
            Data = JsonSerializer.SerializeToElement(data, SerializerOptions),
        };

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> without data.
    /// </summary>
    public static CommandDefinition Create(
        string type,
        TimeSpan? maxExecutionTime = null,
        TimeSpan? maxWaitDuration = null
    ) =>
        new()
        {
            Type = type,
            MaxExecutionTime = maxExecutionTime,
            MaxWaitDuration = maxWaitDuration,
        };

    /// <inheritdoc/>
    public override string ToString() => Type;
}
