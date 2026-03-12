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
    /// Command configuration. The engine deserializes this into the type
    /// declared by the matching <see cref="ICommand.CommandDataType"/>.
    /// </summary>
    [JsonPropertyName("data")]
    public JsonElement? Data { get; init; }

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> with typed data, serialized via <see cref="CommandSerializerOptions.Default"/>.
    /// </summary>
    public static CommandDefinition Create<TData>(string type, TData data, TimeSpan? maxExecutionTime = null)
        where TData : class =>
        new()
        {
            Type = type,
            MaxExecutionTime = maxExecutionTime,
            Data = JsonSerializer.SerializeToElement(data, CommandSerializerOptions.Default),
        };

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> without data.
    /// </summary>
    public static CommandDefinition Create(string type, TimeSpan? maxExecutionTime = null) =>
        new() { Type = type, MaxExecutionTime = maxExecutionTime };

    /// <inheritdoc/>
    public override string ToString() => Type;
}
