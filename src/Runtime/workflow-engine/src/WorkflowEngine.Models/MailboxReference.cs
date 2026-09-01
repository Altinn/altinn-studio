using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Declares a <em>receive workflow</em>: its first step consumes exactly one message from the named
/// mailbox, or the fact that none can ever come. The position is the engine's to assign, not the caller's.
/// </summary>
public sealed record MailboxReference
{
    /// <summary>
    /// The mailbox to receive from; must exist in the enqueue's namespace. A <em>closed</em> mailbox is not an
    /// error: the receiver is born runnable — with the delivery already at its position (an accepted delivery
    /// outranks closure), or with the closing signal.
    /// </summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }
}
