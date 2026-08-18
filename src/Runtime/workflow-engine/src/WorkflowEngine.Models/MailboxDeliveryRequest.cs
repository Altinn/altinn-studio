using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Request to deliver one message into a mailbox.
/// </summary>
/// <remarks>
/// The engine, not the caller, owns the delivery's position: a caller identifies its message by
/// <see cref="IdempotencyKey"/> instead, so an at-least-once forwarder that sends the same message twice
/// gets one delivery at one position rather than two.
/// </remarks>
public sealed record MailboxDeliveryRequest
{
    /// <summary>
    /// Gets the caller's key for this message, unique within the mailbox. Replaying a key returns the
    /// delivery it already made rather than appending another one. A forwarder should pass the source's
    /// own message id.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// Gets the message body, stored verbatim and handed to the receiving workflow unchanged. The engine
    /// never parses it: any structure, envelope, or signature inside it is the sender's and the
    /// receiver's business. Limited to <see cref="EngineSettings.MaxMailboxPayloadSize"/> UTF-8 bytes;
    /// an empty payload is accepted, since a message can carry its whole meaning in its arrival.
    /// </summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }
}
