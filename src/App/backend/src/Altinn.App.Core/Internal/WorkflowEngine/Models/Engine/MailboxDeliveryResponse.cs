using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A delivery as the engine reports it — the same shape whether the call appended it or replayed one the mailbox
/// already held. The payload is deliberately not echoed back.
/// </summary>
internal sealed record MailboxDeliveryResponse
{
    /// <summary>The mailbox the message was delivered into.</summary>
    [JsonPropertyName("mailboxId")]
    public required Guid MailboxId { get; init; }

    /// <summary>
    /// The position the delivery holds in the mailbox's log — gapless, assigned in arrival order, and
    /// the address the receiver enqueued at the matching position reads it by. Diagnostics only: it is
    /// not something the forwarder or its caller acts on.
    /// </summary>
    [JsonPropertyName("idx")]
    public required long Idx { get; init; }

    /// <summary>The caller's key for the message that occupies this position.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// When the mailbox accepted the delivery. Reported from the row, so a replay reports the original
    /// instant rather than the replay's.
    /// </summary>
    [JsonPropertyName("acceptedAt")]
    public required DateTimeOffset AcceptedAt { get; init; }
}
