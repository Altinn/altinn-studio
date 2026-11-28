using System.Globalization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// The non-data half of <see cref="WorkflowCallbackState"/>, live for one callback: what travels step to
/// step that is not instance data and cannot be re-derived from it. Restored from the incoming blob, handed
/// to the command, written back into the outgoing blob — a command that never touches it forwards it
/// unchanged, and a deferral echoes the incoming blob, discarding anything recorded.
/// </summary>
internal sealed class WorkflowCallbackStateCarry
{
    /// <summary>
    /// The external stage whose mailbox is open, by item index. A service task opens one mailbox at a time, so the
    /// carry holds at most one.
    /// </summary>
    private int _stageIndex;

    private CarriedMailbox? _mailbox;

    /// <summary>The shape of every workflow that has opened no mailbox.</summary>
    public WorkflowCallbackStateCarry() { }

    /// <summary>
    /// Restores the carry from an incoming blob. The key must be the canonical rendering of an item index, and the
    /// blob may carry one mailbox at most, as this app-lib writes them.
    /// </summary>
    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        if (state.Mailboxes is not { } carried || carried.Count == 0)
        {
            return;
        }

        if (carried.Count > 1)
        {
            throw new InvalidOperationException(
                $"The workflow state carries {carried.Count.ToString(CultureInfo.InvariantCulture)} mailboxes, and "
                    + "this app-lib keeps one open at a time. This blob was written by a version of this app-lib that "
                    + "opened several; nothing in this version can honor it."
            );
        }

        (string key, CarriedMailbox mailbox) = carried.Single();
        if (
            !int.TryParse(key, NumberStyles.None, CultureInfo.InvariantCulture, out int stageIndex)
            || key != stageIndex.ToString(CultureInfo.InvariantCulture)
        )
        {
            throw new InvalidOperationException(
                $"The workflow state carries a mailbox under key '{key}', which is not an external stage's "
                    + "item index as this app-lib writes one. This blob was written by a version of this "
                    + "app-lib that keyed mailboxes differently; nothing in this version can honor it."
            );
        }

        _stageIndex = stageIndex;
        _mailbox = mailbox;
    }

    /// <summary>
    /// The open mailbox in its blob shape: keyed by its stage's item index as a string, or <c>null</c> when none
    /// is open — not an empty map, so the blob a workflow with no mailbox publishes keeps the shape it always had.
    /// </summary>
    public IReadOnlyDictionary<string, CarriedMailbox>? Mailboxes =>
        _mailbox is null
            ? null
            : new Dictionary<string, CarriedMailbox>(StringComparer.Ordinal)
            {
                [_stageIndex.ToString(CultureInfo.InvariantCulture)] = _mailbox,
            };

    /// <summary>
    /// Records the mailbox the external stage at the given item index just minted. Re-recording the same mailbox is
    /// the idempotent replay of a mint and is accepted; any other mailbox while one is open throws rather than
    /// picking a winner.
    /// </summary>
    public void RecordMailbox(int stageIndex, Guid mailboxId, DateTimeOffset deadline)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(stageIndex);
        ArgumentOutOfRangeException.ThrowIfEqual(mailboxId, Guid.Empty, nameof(mailboxId));

        if (_mailbox is { } open && (open.Id != mailboxId || _stageIndex != stageIndex))
        {
            throw new InvalidOperationException(
                $"The stage at index {_stageIndex} still carries mailbox '{open.Id}', so the stage at index "
                    + $"{stageIndex} cannot also carry '{mailboxId}'. A service task opens one mailbox at a time."
            );
        }

        _stageIndex = stageIndex;
        _mailbox = new CarriedMailbox { Id = mailboxId, Deadline = deadline };
    }

    /// <summary>
    /// The mailbox the external stage at the given item index opened, or <c>null</c> when this workflow carries
    /// none for it.
    /// </summary>
    public CarriedMailbox? FindMailbox(int stageIndex) => _stageIndex == stageIndex ? _mailbox : null;

    /// <summary>The open mailbox, whichever stage opened it, or <c>null</c> when none is open.</summary>
    public CarriedMailbox? OpenMailbox => _mailbox;

    /// <summary>
    /// Records that the open mailbox has closed, dropping it from the blob this callback publishes, so the next
    /// external stage, or the next transition's, can open its own.
    /// </summary>
    public void RecordMailboxClosed() => _mailbox = null;
}
