namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// The non-data half of <see cref="WorkflowCallbackState"/>, live for one callback: what the app is carrying
/// from step to step that is not instance data and cannot be re-derived from it.
/// </summary>
/// <remarks>
/// The instance and its form data survive a callback because they are restored into an
/// <c>InstanceDataUnitOfWork</c> and re-captured from it; everything else in the blob has no such home. The
/// callback controller builds this from the incoming blob, hands it to the command, and writes it back when it
/// captures the outgoing blob — so a command that never touches it forwards it unchanged, which is what the
/// steps between a mailbox's declaring stage and the step that enqueues its first receiver must do.
/// <para>
/// Deliberately mutable, because a value that has to be threaded through every result type is one some step
/// will forget to thread; and deliberately narrow, because the only way to change it is a method named for the
/// one thing it records. It is per-callback, not per-workflow: a deferral echoes the incoming blob unchanged,
/// so anything recorded during an attempt that defers is discarded with the attempt.
/// </para>
/// </remarks>
internal sealed class WorkflowCallbackStateCarry
{
    /// <summary>Creates a carry holding nothing — the shape of every workflow that has opened no mailbox.</summary>
    public WorkflowCallbackStateCarry() { }

    /// <summary>Creates the carry described by a restored state blob.</summary>
    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        MailboxId = state.MailboxId;
    }

    /// <summary>The mailbox this workflow's service task opened, or <c>null</c> when it has opened none yet.</summary>
    public Guid? MailboxId { get; private set; }

    /// <summary>
    /// Records the mailbox the declaring stage just minted, so the step that enqueues the first receive workflow
    /// can address it. A pipeline declares at most one mailbox and each callback runs one command, so recording a
    /// <em>different</em> mailbox over one already carried is unreachable by construction; it throws rather than
    /// picking a winner, because either answer would leave a published address with no receiver.
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
    /// Whether the exchange this callback's workflow was receiving on has been concluded by the handler that just
    /// ran. The blob captured from a concluded carry <strong>drops</strong> <see cref="MailboxId"/>, so nothing
    /// downstream believes it still holds an open mailbox.
    /// </summary>
    public bool MailboxConcluded { get; private set; }

    /// <summary>
    /// Records that the handler concluded the exchange, so the state blob this callback publishes stops carrying
    /// the mailbox it was answering on. This is the one thing the mailbox id must <em>not</em> outlive: the
    /// process-next workflow the conclusion starts inherits this callback's captured blob and may open a mailbox of
    /// its own, and a blob still naming the finished exchange's mailbox would make <see cref="RecordMailbox"/>
    /// refuse the new one and fail that transition permanently.
    /// </summary>
    public void RecordMailboxConcluded() => MailboxConcluded = true;
}
