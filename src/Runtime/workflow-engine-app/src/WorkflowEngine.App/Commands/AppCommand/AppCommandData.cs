using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Command.Data shape for app commands.
/// </summary>
internal sealed record AppCommandData
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }
}
