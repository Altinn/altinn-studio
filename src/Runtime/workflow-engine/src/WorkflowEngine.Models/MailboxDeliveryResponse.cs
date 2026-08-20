using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A delivery as the engine reports it — the same shape whether the call appended it or replayed one the
/// mailbox already held. The payload is deliberately not echoed back: the caller just sent it, and the only
/// thing it could not have known is the position the engine assigned.
/// </summary>
public sealed record MailboxDeliveryResponse
{
    /// <summary>Gets the mailbox the message was delivered into.</summary>
    [JsonPropertyName("mailboxId")]
    public required Guid MailboxId { get; init; }

    /// <summary>
    /// Gets the position the delivery holds in the mailbox's log — gapless, assigned in arrival order, and the
    /// address the receiver enqueued at the matching position reads it by.
    /// </summary>
    [JsonPropertyName("idx")]
    public required long Idx { get; init; }

    /// <summary>Gets the caller's key for the message that occupies this position.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// Gets when the mailbox accepted the delivery. Reported from the row, so a replay reports the original
    /// instant rather than the replay's.
    /// </summary>
    [JsonPropertyName("acceptedAt")]
    public required DateTimeOffset AcceptedAt { get; init; }
}
