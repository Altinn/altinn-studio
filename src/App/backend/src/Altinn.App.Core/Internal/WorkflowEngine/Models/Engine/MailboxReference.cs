using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Declares that a workflow is a <em>receive workflow</em>: its first step consumes exactly one message from the
/// named mailbox, or the fact that none can ever come. Which position it consumes is assigned by the engine
/// under the mailbox's row lock at enqueue, in arrival order.
/// </summary>
internal sealed record MailboxReference
{
    /// <summary>
    /// The mailbox to receive from. Must name a mailbox that exists in the enqueue's namespace; a receiver for a
    /// mailbox the engine does not know would be a workflow nothing could ever release. A <em>closed</em> mailbox is
    /// not an error: the receiver is born runnable with a delivery already at its position (an accepted delivery
    /// outranks closure), and born runnable with the closing signal otherwise.
    /// </summary>
    [JsonPropertyName("id")]
    public required Guid Id { get; init; }
}
