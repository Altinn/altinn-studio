using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Payload sent to the application when an AppCommand is executed.
/// </summary>
public sealed record AppCallbackPayload
{
    /// <summary>
    /// The command key. A unique identifier that is understood by the app's webhook receiver.
    /// </summary>
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    /// <summary>
    /// The actor this request is executed on behalf of.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    // TODO: This is named 'LockKey' elsewhere, unify to one or the other
    /// <summary>
    /// The lock token associated with this process/next request
    /// </summary>
    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    /// <summary>
    /// Payload to accompany the command.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    /// <summary>
    /// A correlation ID linking paired AppCommand and ReplyAppCommand steps.
    /// The app uses this ID to POST replies back to the engine via the reply endpoint.
    /// </summary>
    [JsonPropertyName("correlationId")]
    public Guid? CorrelationId { get; init; }

    /// <summary>
    /// </summary>
    [JsonPropertyName("reply")]
    public string? Reply { get; init; }
}
