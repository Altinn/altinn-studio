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

    /// <summary>
    ///
    /// </summary>
    [JsonPropertyName("metadata")]
    public string? Metadata { get; init; }
}
