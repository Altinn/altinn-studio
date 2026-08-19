using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Declares that a workflow is a <em>receive workflow</em>: its first step consumes exactly one message
/// from the named mailbox, or the fact that none can ever come.
/// </summary>
/// <remarks>
/// The block names a mailbox and nothing else. Which position in that mailbox the workflow consumes is
/// not the caller's to choose — the engine assigns it under the mailbox's row lock at enqueue, in
/// arrival order, so the receivers log is gapless for the same reason the deliveries log is. A caller
/// that could pick its own position could pick one twice, or skip one, and the pairing between the two
/// logs is the whole rendezvous.
/// </remarks>
public sealed record MailboxReference
{
    /// <summary>
    /// The mailbox to receive from. Must name a mailbox that exists in the enqueue's namespace; a
    /// receiver for a mailbox the engine does not know would be a workflow nothing could ever release.
    /// </summary>
    /// <remarks>
    /// A <em>closed</em> mailbox is not an error, and this is the case that looks wrong and is not: a
    /// receiver enqueued against a closed mailbox is still born runnable when a delivery already sits at
    /// its position — an accepted delivery outranks closure — and born runnable with the closing signal
    /// otherwise. That is what lets a saga replaying after the deadline drain the accepted backlog
    /// instead of dropping it.
    /// </remarks>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }
}
