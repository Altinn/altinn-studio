using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A mailbox as the engine reports it — returned by the mint, read, and close endpoints alike, so a
/// caller always sees the same shape regardless of which operation it came from.
/// </summary>
public sealed record MailboxResponse
{
    /// <summary>
    /// Gets the engine-generated mailbox id (uuidv7). This is the reply address an app embeds in its
    /// outbound message: unguessable, but not a secret.
    /// </summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    /// <summary>Gets the namespace that owns the mailbox.</summary>
    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }

    /// <summary>Gets the caller's key for the mint that created this mailbox, unique within the namespace.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>Gets the workflow-collection key the mailbox is grouped under, when one was supplied.</summary>
    [JsonPropertyName("collectionKey")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? CollectionKey { get; init; }

    /// <summary>
    /// Gets the timeout the mailbox was minted with, kept as the record of what was asked for.
    /// <see cref="Deadline"/> is the value that binds.
    /// </summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Gets the absolute instant the mailbox stops accepting deliveries, stamped at mint as
    /// <c>createdAt + timeout</c>. Absolute and exchange-level: it never moves, and it bounds every
    /// wait against this mailbox.
    /// </summary>
    [JsonPropertyName("deadline")]
    public required DateTimeOffset Deadline { get; init; }

    /// <summary>Gets the current lifecycle status.</summary>
    [JsonPropertyName("status")]
    public required MailboxStatus Status { get; init; }

    /// <summary>
    /// Gets why the mailbox was closed, when it has been. Null exactly while
    /// <see cref="Status"/> is <see cref="MailboxStatus.Open"/>.
    /// </summary>
    [JsonPropertyName("disposedReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public MailboxDisposedReason? DisposedReason { get; init; }

    /// <summary>
    /// Gets the next position the deliveries log will assign — equivalently, the number of deliveries
    /// the mailbox has accepted.
    /// </summary>
    [JsonPropertyName("nextIdx")]
    public required long NextIdx { get; init; }

    /// <summary>
    /// Gets the next position the receivers log will assign — equivalently, the number of receive
    /// workflows enqueued against the mailbox.
    /// </summary>
    [JsonPropertyName("nextSeq")]
    public required long NextSeq { get; init; }

    /// <summary>
    /// Gets the number of accepted deliveries no receiver was ever enqueued for. Derived from the two counters
    /// rather than counted, which is exact because both logs are gapless: a delivery at position <c>i</c> is
    /// consumed exactly when a receiver was enqueued at <c>seq = i</c>.
    /// </summary>
    [JsonPropertyName("unconsumedDeliveries")]
    public long UnconsumedDeliveries => Math.Max(0, NextIdx - NextSeq);

    /// <summary>Gets when the mailbox was minted.</summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>
    /// Gets when the mailbox was closed, when it has been. Reported from the row, so an idempotent
    /// repeat close reports the original instant rather than the replay's.
    /// </summary>
    [JsonPropertyName("disposedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? DisposedAt { get; init; }
}
