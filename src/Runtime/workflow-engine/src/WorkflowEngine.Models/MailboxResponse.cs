using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A mailbox as the engine reports it — returned by the mint, read, and close endpoints alike, so a
/// caller always sees the same shape regardless of which operation it came from.
/// </summary>
public sealed record MailboxResponse
{
    /// <summary>The engine-generated id (uuidv7) — the reply address: unguessable, but not a secret.</summary>
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

    /// <summary>The record of what was asked for; <see cref="Deadline"/> is what binds.</summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// The absolute instant the mailbox stops accepting deliveries, stamped at mint as
    /// <c>createdAt + timeout</c>. It never moves.
    /// </summary>
    [JsonPropertyName("deadline")]
    public required DateTimeOffset Deadline { get; init; }

    /// <summary>Gets the current lifecycle status.</summary>
    [JsonPropertyName("status")]
    public required MailboxStatus Status { get; init; }

    /// <summary>Why the mailbox was closed. Null exactly while open.</summary>
    [JsonPropertyName("disposedReason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public MailboxDisposedReason? DisposedReason { get; init; }

    /// <summary>The deliveries log's next position — the number of deliveries accepted.</summary>
    [JsonPropertyName("nextIdx")]
    public required long NextIdx { get; init; }

    /// <summary>The receivers log's next position — the number of receivers enqueued.</summary>
    [JsonPropertyName("nextSeq")]
    public required long NextSeq { get; init; }

    /// <summary>
    /// Accepted deliveries no receiver was enqueued for. Derived from the two counters, exact because both
    /// logs are gapless.
    /// </summary>
    [JsonPropertyName("unconsumedDeliveries")]
    public long UnconsumedDeliveries => Math.Max(0, NextIdx - NextSeq);

    /// <summary>Gets when the mailbox was minted.</summary>
    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>When the mailbox was closed. From the row, so a repeat close reports the original instant.</summary>
    [JsonPropertyName("disposedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTimeOffset? DisposedAt { get; init; }
}
