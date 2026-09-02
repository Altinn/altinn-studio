using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Request to mint a mailbox. The engine owns the id; the caller identifies its mint attempt by
/// <see cref="IdempotencyKey"/>, so a retried step replays onto the same mailbox.
/// </summary>
public sealed record MailboxCreateRequest
{
    /// <summary>The caller's key for this mint, unique within the namespace.</summary>
    [JsonPropertyName("idempotencyKey")]
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// How long the mailbox stays open. Positive, at most <see cref="EngineSettings.MaxMailboxTimeout"/>; the
    /// deadline stamped from it at mint is what binds thereafter.
    /// </summary>
    [JsonPropertyName("timeout")]
    public required TimeSpan Timeout { get; init; }

    /// <summary>
    /// Optional workflow-collection key: grouping for operators, and the scope of the open-mailboxes cap.
    /// </summary>
    [JsonPropertyName("collectionKey")]
    public string? CollectionKey { get; init; }
}
