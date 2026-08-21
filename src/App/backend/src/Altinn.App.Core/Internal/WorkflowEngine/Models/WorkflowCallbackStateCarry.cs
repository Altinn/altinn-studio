namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// The non-data half of <see cref="WorkflowCallbackState"/>, live for one callback: what travels step to
/// step that is not instance data and cannot be re-derived from it.
/// </summary>
/// <remarks>
/// Restored from the incoming blob, handed to the command, written back into the outgoing blob — so a
/// command that never touches it forwards it unchanged. Deliberately mutable (a value threaded through
/// every result type is one some step forgets to thread) and narrow (changed only by methods named for the
/// one thing they record). Per-callback: a deferral echoes the incoming blob, discarding anything recorded.
/// </remarks>
internal sealed class WorkflowCallbackStateCarry
{
    /// <summary>The shape of every workflow that has opened no mailbox.</summary>
    public WorkflowCallbackStateCarry() { }

    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        MailboxId = state.MailboxId;
    }

    /// <summary>The mailbox this workflow's service task opened, or <c>null</c> when it has opened none yet.</summary>
    public Guid? MailboxId { get; private set; }

    /// <summary>
    /// Records the minted mailbox so the step that enqueues the first receiver can address it. Recording a
    /// different mailbox over one already carried is unreachable by construction; it throws rather than picking
    /// a winner.
    /// </summary>
    public void RecordMailbox(Guid mailboxId)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(mailboxId, Guid.Empty, nameof(mailboxId));

        if (MailboxId is { } carried && carried != mailboxId)
        {
            throw new InvalidOperationException(
                $"This workflow already carries mailbox '{carried}' and cannot also carry '{mailboxId}'. A service "
                    + "task pipeline opens at most one mailbox."
            );
        }

        MailboxId = mailboxId;
    }

    /// <summary>
    /// Whether the handler concluded the exchange. A concluded carry's blob <strong>drops</strong>
    /// <see cref="MailboxId"/>.
    /// </summary>
    public bool MailboxConcluded { get; private set; }

    /// <summary>
    /// Records the conclusion, so the published blob stops naming the mailbox. The one thing the id must not
    /// outlive: the next transition inherits this blob and may open a mailbox of its own, which
    /// <see cref="RecordMailbox"/> would refuse over a stale one.
    /// </summary>
    public void RecordMailboxConcluded() => MailboxConcluded = true;
}
