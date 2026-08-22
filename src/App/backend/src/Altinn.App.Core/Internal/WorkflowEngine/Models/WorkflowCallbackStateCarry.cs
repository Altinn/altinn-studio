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
    /// <summary>
    /// Keyed by the stage that opened each mailbox: the stage name is the exchange's identity everywhere, and it
    /// is a value we own (stage names are already a wire-compatibility surface). Ordinal, like every other stage
    /// name comparison. Nothing here assumes the map holds at most one entry, even where today's builder does.
    /// </summary>
    private readonly Dictionary<string, CarriedMailbox> _mailboxes = new(StringComparer.Ordinal);

    /// <summary>The shape of every workflow that has opened no mailbox.</summary>
    public WorkflowCallbackStateCarry() { }

    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        if (state.Mailboxes is not { } carried)
        {
            return;
        }

        foreach ((string stageName, CarriedMailbox mailbox) in carried)
        {
            _mailboxes[stageName] = mailbox;
        }
    }

    /// <summary>
    /// The mailboxes still traveling, keyed by the stage that opened each, or <c>null</c> when none is — not an
    /// empty map, so the blob a workflow with no exchange publishes keeps the shape it always had. A concluded
    /// exchange's mailbox is already gone from here (see <see cref="RecordMailboxConcluded"/>).
    /// </summary>
    public IReadOnlyDictionary<string, CarriedMailbox>? Mailboxes => _mailboxes.Count == 0 ? null : _mailboxes;

    /// <summary>
    /// Records the mailbox the named stage just minted, so the step that enqueues the first receiver can address
    /// it. Re-recording the same mailbox is the idempotent replay of a mint and is accepted; recording a
    /// <em>different</em> mailbox for the same stage is unreachable by construction, and throws rather than
    /// picking a winner.
    /// </summary>
    /// <param name="stageName">The stage that opened it — the exchange's identity from here on.</param>
    /// <param name="mailboxId">The engine's id for the minted mailbox.</param>
    /// <param name="deadline">When the mailbox stops accepting messages.</param>
    public void RecordMailbox(string stageName, Guid mailboxId, DateTimeOffset deadline)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(stageName);
        ArgumentOutOfRangeException.ThrowIfEqual(mailboxId, Guid.Empty, nameof(mailboxId));

        if (_mailboxes.TryGetValue(stageName, out CarriedMailbox? carried) && carried.Id != mailboxId)
        {
            throw new InvalidOperationException(
                $"Stage '{stageName}' already carries mailbox '{carried.Id}' and cannot also carry '{mailboxId}'. A "
                    + "stage opens one mailbox, once."
            );
        }

        _mailboxes[stageName] = new CarriedMailbox { Id = mailboxId, Deadline = deadline };
    }

    /// <summary>
    /// The mailbox the named stage opened, or <c>null</c> when this workflow carries none for it.
    /// </summary>
    public CarriedMailbox? FindMailbox(string stageName) =>
        _mailboxes.TryGetValue(stageName, out CarriedMailbox? mailbox) ? mailbox : null;

    /// <summary>
    /// Records that the exchange the named stage opened has concluded, which <strong>drops</strong> its mailbox
    /// from the blob this callback publishes. The one thing the mailbox must not outlive: the next transition
    /// inherits this blob and may open a mailbox from a stage of the same name, which
    /// <see cref="RecordMailbox"/> would refuse over a stale one. Concluding a stage this workflow carries
    /// nothing for is a no-op — the blob names no mailbox either way.
    /// </summary>
    public void RecordMailboxConcluded(string stageName) => _mailboxes.Remove(stageName);
}
