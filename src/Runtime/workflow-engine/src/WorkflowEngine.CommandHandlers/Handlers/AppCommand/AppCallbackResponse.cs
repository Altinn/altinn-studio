using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Handlers.AppCommand;

/// <summary>
/// Response body from a successful Altinn app callback.
/// </summary>
public sealed record AppCallbackResponse
{
    [JsonPropertyName("state")]
    public string? State { get; init; }
}
