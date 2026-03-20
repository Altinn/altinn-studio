using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Represents the user/entity on whose behalf the engine is executing tasks.
/// </summary>
internal sealed record Actor
{
    [JsonPropertyName("userIdOrOrgNumber")]
    public required string UserIdOrOrgNumber { get; init; }

    [JsonPropertyName("language")]
    public string? Language { get; init; }
}
