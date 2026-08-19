namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// The non-data half of <see cref="WorkflowCallbackState"/>, live for one callback: what the app is
/// carrying from step to step that is not instance data and cannot be re-derived from it.
/// </summary>
/// <remarks>
/// <para>
/// The instance and its form data survive a callback because they are restored into an
/// <c>InstanceDataUnitOfWork</c> and re-captured from it. Everything else in the blob has no such
/// home, so it would be dropped the moment a step that knows nothing about it runs. This object is
/// that home: the callback controller builds it from the incoming blob, hands it to the command on
/// <c>ProcessEngineCommandContext</c>, and writes it back when it captures the outgoing blob. A
/// command that never touches it therefore forwards it unchanged, which is exactly what the steps
/// between a mailbox's declaring stage and the step that enqueues its first receiver must do.
/// </para>
/// <para>
/// Deliberately mutable and deliberately narrow. Mutable, because transitivity is the property that
/// matters most and a value that has to be threaded through every result type is a value some step
/// will eventually forget to thread. Narrow, because the only way to change it is a method named for
/// the one thing it records — there is no general "put anything here" setter, and adding a second
/// carried value means adding a second such method, in this file, on purpose.
/// </para>
/// <para>
/// It is per-callback, not per-workflow: a deferring step's response echoes the incoming blob
/// unchanged (a deferral is stateless), so anything recorded during an attempt that defers is
/// discarded along with the attempt.
/// </para>
/// </remarks>
internal sealed class WorkflowCallbackStateCarry
{
    /// <summary>
    /// Creates a carry holding nothing — the shape of every workflow that has not opened a mailbox.
    /// </summary>
    public WorkflowCallbackStateCarry() { }

    /// <summary>
    /// Creates the carry described by a restored state blob.
    /// </summary>
    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        MailboxId = state.MailboxId;
    }

    /// <summary>
    /// The mailbox this workflow's service task opened, or <c>null</c> when it has opened none yet.
    /// </summary>
    public Guid? MailboxId { get; private set; }

    /// <summary>
    /// Records the mailbox the declaring stage just minted, so the step that enqueues the first receive
    /// workflow can address it.
    /// </summary>
    /// <remarks>
    /// A pipeline declares at most one mailbox and each callback runs one command, so this is called at
    /// most once per callback, and a step's input blob is the previous step's output — never its own
    /// earlier attempt's. Recording a <em>different</em> mailbox over one already carried is therefore
    /// unreachable by construction; it throws rather than picking a winner, because either answer would
    /// leave a published address with no receiver.
    /// </remarks>
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
    /// Whether the exchange this callback's workflow was receiving on has been concluded by the
    /// handler that just ran. The blob captured from a concluded carry <strong>drops</strong>
    /// <see cref="MailboxId"/>, so nothing downstream believes it still holds an open mailbox.
    /// </summary>
    public bool MailboxConcluded { get; private set; }

    /// <summary>
    /// Records that the handler concluded the exchange, so the state blob this callback publishes
    /// stops carrying the mailbox it was answering on.
    /// </summary>
    /// <remarks>
    /// <para>
    /// This is the one thing the mailbox id must <em>not</em> outlive. The workflow the conclusion
    /// starts — the process-next that advances past the service task — inherits this callback's
    /// captured blob, and its own service task may open a mailbox of its own. Handing it a blob that
    /// still names the finished exchange's mailbox would make
    /// <see cref="RecordMailbox"/> refuse the new one and fail that transition permanently, days
    /// after the exchange it is complaining about ended.
    /// </para>
    /// <para>
    /// A second value with a second named method, deliberately, rather than a general setter or a
    /// mutable <see cref="MailboxId"/>: the carry's whole point is that the only way to change it is
    /// a method named for the one thing it records.
    /// </para>
    /// </remarks>
    public void RecordMailboxConcluded() => MailboxConcluded = true;
}
