using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Request to mint a mailbox. The engine, not the caller, owns the mailbox id: the caller identifies its mint
/// attempt by <see cref="IdempotencyKey"/>, so a retried step replays onto the same mailbox.
/// </summary>
internal sealed record MailboxCreateRequest
{
    /// <summary>
    /// The caller's key for this mint, unique within the namespace. Replaying a key returns the
    /// mailbox it already minted rather than creating another one. Limited to 200 characters.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// How long the mailbox stays open. Must be positive and no larger than the engine's configured maximum; the
    /// engine stamps the absolute deadline from it at mint, and the deadline is what bounds the exchange.
    /// </summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// The workflow-collection key the mailbox belongs to. Grouping only: it places the mailbox under its collection
    /// for operators, and scopes the open-mailboxes cap.
    /// </summary>
    [JsonPropertyName("collectionKey")]
    public string? CollectionKey { get; init; }
}
