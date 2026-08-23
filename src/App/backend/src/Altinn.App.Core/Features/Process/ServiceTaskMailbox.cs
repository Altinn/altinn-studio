namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox opened for the stage that declared it, handed to that stage's work as its second argument.
/// <see cref="Id"/> is the reply address the stage publishes in its outbound message;
/// <see cref="Deadline"/> is when the mailbox stops accepting answers. Minted by its own step immediately before
/// the declaring stage, keyed on that step's id; a retried or deferred attempt of the stage is handed this same
/// mailbox, because the mint has already completed and its record travels in the workflow state.
/// </summary>
public sealed record ServiceTaskMailbox
{
    /// <summary>
    /// The mailbox's id — the reply address. Unguessable, but <strong>not a secret</strong>: it is
    /// the address a message is sent to, not proof of who sent it. Authenticity of what comes back
    /// is the receiving side's job, exactly as it is for any other callback address.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// The instant the mailbox stops accepting messages, stamped when it was minted as <em>mint time plus
    /// <see cref="MailboxOptions.Timeout"/></em>. Absolute: it never moves, and no message resets it.
    /// </summary>
    public required DateTimeOffset Deadline { get; init; }
}
