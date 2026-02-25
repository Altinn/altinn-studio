using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Response body from a successful app callback.
/// </summary>
public sealed record AppCallbackResponse
{
    /// <summary>
    /// Opaque state returned by the app. The engine persists but never inspects this.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }
}
