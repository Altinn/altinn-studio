using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A mailbox as the engine reports it — returned by the mint, read, and close endpoints alike, so a
/// caller always sees the same shape regardless of which operation it came from.
/// </summary>
internal sealed record MailboxResponse
{
    /// <summary>The engine-generated id — the reply address: unguessable, but not a secret.</summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }

    [JsonPropertyName("namespace")]
    public required string Namespace { get; init; }

    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    [JsonPropertyName("collectionKey")]
    public string? CollectionKey { get; init; }

    /// <summary>The record of what was asked for; <see cref="Deadline"/> is what binds.</summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>The absolute instant the mailbox stops accepting deliveries; it never moves.</summary>
    [JsonPropertyName("deadline")]
    public required DateTimeOffset Deadline { get; init; }

    [JsonPropertyName("status")]
    public required MailboxStatus Status { get; init; }

    /// <summary>Why the mailbox was closed. Null exactly while open.</summary>
    [JsonPropertyName("disposedReason")]
    public MailboxDisposedReason? DisposedReason { get; init; }

    /// <summary>The deliveries log's next position — the number of deliveries accepted.</summary>
    [JsonPropertyName("nextIdx")]
    public required long NextIdx { get; init; }

    /// <summary>The receivers log's next position — the number of receivers enqueued.</summary>
    [JsonPropertyName("nextSeq")]
    public required long NextSeq { get; init; }

    /// <summary>
    /// Accepted deliveries no receiver was enqueued for, as the engine computed it. Carried through rather than
    /// recomputed: duplicating the arithmetic is the one drift the wire-contract guard cannot catch.
    /// </summary>
    [JsonPropertyName("unpairedDeliveries")]
    public long UnpairedDeliveries { get; init; }

    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>When the mailbox was closed; a repeat close reports the original instant.</summary>
    [JsonPropertyName("disposedAt")]
    public DateTimeOffset? DisposedAt { get; init; }
}
