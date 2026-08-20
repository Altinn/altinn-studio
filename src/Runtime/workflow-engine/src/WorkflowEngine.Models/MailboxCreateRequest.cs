using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Request to mint a mailbox — a durable inbox external messages can be delivered into. The engine, not the
/// caller, owns the mailbox id: a caller identifies its mint attempt by <see cref="IdempotencyKey"/>, so a
/// retried step replays onto the same mailbox rather than forking a second one.
/// </summary>
public sealed record MailboxCreateRequest
{
    /// <summary>
    /// Gets the caller's key for this mint, unique within the namespace. Replaying a key returns the
    /// mailbox it already minted rather than creating another one.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// Gets how long the mailbox stays open. Must be positive and no larger than
    /// <see cref="EngineSettings.MaxMailboxTimeout"/>; the engine stamps the absolute deadline from it at mint,
    /// and the deadline — not this value — is what bounds the exchange from then on.
    /// </summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Gets the optional workflow-collection key the mailbox belongs to. Grouping only: it places the mailbox
    /// under its collection for operators and scopes the open-mailboxes cap.
    /// </summary>
    [JsonPropertyName("collectionKey")]
    public string? CollectionKey { get; init; }
}
