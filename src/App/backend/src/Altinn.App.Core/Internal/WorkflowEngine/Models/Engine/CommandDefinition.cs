using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Describes a command to be executed by the workflow engine.
/// The engine stores and routes commands but does not interpret them —
/// a registered command handler handles execution based on <see cref="Type"/>.
/// </summary>
internal sealed record CommandDefinition
{
    private static readonly JsonSerializerOptions _serializerOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// The command type discriminator. Matched against registered command handlers (e.g. "app", "webhook").
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
    /// Command-specific data. The engine deserializes this into the type
    /// declared by the matching command handler.
    /// </summary>
    [JsonPropertyName("data")]
    public JsonElement? Data { get; init; }

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> with typed data serialized into <see cref="Data"/>.
    /// </summary>
    public static CommandDefinition Create<TData>(string type, TData data, TimeSpan? maxExecutionTime = null)
        where TData : class =>
        new()
        {
            Type = type,
            MaxExecutionTime = maxExecutionTime,
            Data = JsonSerializer.SerializeToElement(data, _serializerOptions),
        };

    /// <summary>
    /// Creates a <see cref="CommandDefinition"/> without data.
    /// </summary>
    public static CommandDefinition Create(string type, TimeSpan? maxExecutionTime = null) =>
        new() { Type = type, MaxExecutionTime = maxExecutionTime };

    /// <inheritdoc/>
    public override string ToString() => Type;
}
