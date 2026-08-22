using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Request to deliver one message. The engine owns the position; the caller identifies its message by
/// <see cref="IdempotencyKey"/>, so an at-least-once forwarder's resend lands on the same position.
/// </summary>
public sealed record MailboxDeliveryRequest
{
    /// <summary>The caller's key, unique within the mailbox — pass the source's own message id.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// The message body, stored verbatim and never parsed. At most
    /// <see cref="EngineSettings.MaxMailboxPayloadSize"/> UTF-8 bytes; empty is accepted.
    /// </summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }
}
