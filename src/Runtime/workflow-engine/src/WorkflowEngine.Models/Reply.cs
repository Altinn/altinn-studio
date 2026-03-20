using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Represents a reply received from an external party for a suspended step.
/// </summary>
public sealed record Reply
{
    /// <summary>
    /// The primary key.
    /// </summary>
    public required Guid DatabaseId { get; init; }

    /// <summary>
    /// The step that will receive the reply..
    /// </summary>
    public required Guid StepId { get; init; }

    /// <summary>
    /// The reply payload.
    /// </summary>
    public string? Payload { get; set; }

    /// <summary>
    /// When the reply was received.
    /// </summary>
    public DateTimeOffset? ReceivedAt { get; set; }
}

/// <summary>
/// Request body for submitting an external reply.
/// </summary>
public sealed record SubmitReplyRequest
{
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }
}
