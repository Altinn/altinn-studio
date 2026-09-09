using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A delivery as the engine reports it — the same shape for an append and a replay. The payload is not
/// echoed back: the only thing the caller could not know is the position.
/// </summary>
public sealed record MailboxDeliveryResponse
{
    /// <summary>Gets the mailbox the message was delivered into.</summary>
    [JsonPropertyName("mailboxId")]
    public required Guid MailboxId { get; init; }

    /// <summary>The gapless position the delivery holds — the address its receiver reads it by.</summary>
    [JsonPropertyName("idx")]
    public required long Idx { get; init; }

    /// <summary>Gets the caller's key for the message that occupies this position.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>When the mailbox accepted the delivery; a replay reports the original instant.</summary>
    [JsonPropertyName("acceptedAt")]
    public required DateTimeOffset AcceptedAt { get; init; }
}
