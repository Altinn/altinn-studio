using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Handlers.AppCommand;

/// <summary>
/// Represents the user/entity on whose behalf the engine is executing tasks.
/// Altinn-specific: used only by <see cref="AppCommandHandler"/>.
/// </summary>
public sealed record Actor
{
    [JsonPropertyName("userIdOrOrgNumber")]
    public required string UserIdOrOrgNumber { get; init; }

    [JsonPropertyName("language")]
    public string? Language { get; init; }
}
