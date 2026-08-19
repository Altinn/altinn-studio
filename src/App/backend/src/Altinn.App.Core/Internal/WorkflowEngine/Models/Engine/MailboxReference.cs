using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Declares that a workflow is a <em>receive workflow</em>: its first step consumes exactly one message
/// from the named mailbox, or the fact that none can ever come.
/// </summary>
/// <remarks>
/// The block names a mailbox and nothing else. Which position in that mailbox the workflow consumes is
/// not the caller's to choose — the engine assigns it under the mailbox's row lock at enqueue, in
/// arrival order, so the receivers log is gapless for the same reason the deliveries log is.
/// </remarks>
internal sealed record MailboxReference
{
    /// <summary>
    /// The mailbox to receive from. Must name a mailbox that exists in the enqueue's namespace; a
    /// receiver for a mailbox the engine does not know would be a workflow nothing could ever release.
    /// </summary>
    /// <remarks>
    /// A <em>closed</em> mailbox is not an error: a receiver enqueued against one is still born runnable
    /// with the delivery already sitting at its position (an accepted delivery outranks closure), and
    /// born runnable with the closing signal otherwise. That is what lets a relay replaying after the
    /// deadline drain the accepted backlog instead of dropping it.
    /// </remarks>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }
}
