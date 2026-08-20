using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A mailbox as the engine reports it — returned by the mint, read, and close endpoints alike, so a
/// caller always sees the same shape regardless of which operation it came from.
/// </summary>
internal sealed record MailboxResponse
{
    /// <summary>
    /// The engine-generated mailbox id. This is the reply address an app embeds in its outbound
    /// message: unguessable, but not a secret.
    /// </summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    /// <summary>The namespace that owns the mailbox.</summary>
    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }

    /// <summary>The caller's key for the mint that created this mailbox, unique within the namespace.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>The workflow-collection key the mailbox is grouped under, when one was supplied.</summary>
    [JsonPropertyName("collectionKey")]
    public string? CollectionKey { get; init; }

    /// <summary>
    /// The timeout the mailbox was minted with, kept as the record of what was asked for.
    /// <see cref="Deadline"/> is the value that binds.
    /// </summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// The absolute instant the mailbox stops accepting deliveries, stamped at mint as
    /// <c>createdAt + timeout</c>. Absolute and exchange-level: it never moves, and it bounds every
    /// wait against this mailbox.
    /// </summary>
    [JsonPropertyName("deadline")]
    public required DateTimeOffset Deadline { get; init; }

    /// <summary>The current lifecycle status.</summary>
    [JsonPropertyName("status")]
    public required MailboxStatus Status { get; init; }

    /// <summary>
    /// Why the mailbox was closed, when it has been. Null exactly while <see cref="Status"/> is
    /// <see cref="MailboxStatus.Open"/>.
    /// </summary>
    [JsonPropertyName("disposedReason")]
    public MailboxDisposedReason? DisposedReason { get; init; }

    /// <summary>
    /// The next position the deliveries log will assign — equivalently, the number of deliveries the
    /// mailbox has accepted.
    /// </summary>
    [JsonPropertyName("nextIdx")]
    public required long NextIdx { get; init; }

    /// <summary>
    /// The next position the receivers log will assign — equivalently, the number of receive
    /// workflows enqueued against the mailbox.
    /// </summary>
    [JsonPropertyName("nextSeq")]
    public required long NextSeq { get; init; }

    /// <summary>
    /// The number of accepted deliveries no receiver was ever enqueued for, as the engine computed and sent it.
    /// Carried through rather than recomputed from the counters here: duplicating the engine's arithmetic is the
    /// one drift the wire-contract guard cannot catch.
    /// </summary>
    [JsonPropertyName("unconsumedDeliveries")]
    public long UnconsumedDeliveries { get; init; }

    /// <summary>When the mailbox was minted.</summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// When the mailbox was closed, when it has been. Reported from the row, so an idempotent repeat
    /// close reports the original instant rather than the replay's.
    /// </summary>
    [JsonPropertyName("disposedAt")]
    public DateTimeOffset? DisposedAt { get; init; }
}
