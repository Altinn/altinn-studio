using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Handlers.AppCommand;

/// <summary>
/// Payload sent to the Altinn application when an AppCommand is executed.
/// </summary>
public sealed record AppCallbackPayload
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }
}
