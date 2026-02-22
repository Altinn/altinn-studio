using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Request model for submitting a reply to a suspended workflow step.
/// </summary>
public sealed record ReplyRequest
{
    /// <summary>
    /// The reply payload.
    /// </summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }
}
