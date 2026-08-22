using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Request to deliver one message into a mailbox. The engine, not the caller, owns the delivery's position: a
/// caller identifies its message by <see cref="IdempotencyKey"/>, so an at-least-once forwarder that sends the
/// same message twice gets one delivery at one position rather than two.
/// </summary>
internal sealed record MailboxDeliveryRequest
{
    /// <summary>
    /// The caller's key for this message, unique within the mailbox — the forwarding source's own
    /// message id. Replaying a key returns the delivery it already made rather than appending another
    /// one. Limited to 200 characters, and may not be empty or whitespace.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// The message body, stored verbatim and handed to the receiving workflow unchanged. The engine
    /// never parses it, so the integrity envelope this app wraps the body in is invisible to it.
    /// </summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }
}
