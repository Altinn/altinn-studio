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
    /// Keyed by the opening stage's item index — the exchange's identity everywhere. Nothing here assumes the
    /// map holds at most one entry.
    /// </summary>
    private readonly Dictionary<int, CarriedMailbox> _mailboxes = new();

    /// <summary>The shape of every workflow that has opened no mailbox.</summary>
    public WorkflowCallbackStateCarry() { }

    /// <summary>
    /// Restores the carry from an incoming blob. Keys must be canonical renderings of an item index — two
    /// spellings of one index would collapse into one entry and let the blob's last writer win.
    /// </summary>
    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        if (state.Mailboxes is not { } carried)
        {
            return;
        }

        foreach ((string key, CarriedMailbox mailbox) in carried)
        {
            if (
                !int.TryParse(key, NumberStyles.None, CultureInfo.InvariantCulture, out int stageIndex)
                || key != stageIndex.ToString(CultureInfo.InvariantCulture)
            )
            {
                throw new InvalidOperationException(
                    $"The workflow state carries a mailbox under key '{key}', which is not an opening stage's "
                        + "item index as this app-lib writes one. This blob was written by a version of this "
                        + "app-lib that keyed mailboxes differently; nothing in this version can honor it."
                );
            }

            _mailboxes[stageIndex] = mailbox;
        }
    }

    /// <summary>
    /// The mailboxes still traveling, in their blob shape: keyed by the opening stage's item index as a
    /// string, or <c>null</c> when none is — not an empty map, so the blob a workflow with no exchange
    /// publishes keeps the shape it always had.
    /// </summary>
    public IReadOnlyDictionary<string, CarriedMailbox>? Mailboxes =>
        _mailboxes.Count == 0
            ? null
            : _mailboxes.ToDictionary(
                kv => kv.Key.ToString(CultureInfo.InvariantCulture),
                kv => kv.Value,
                StringComparer.Ordinal
            );

    /// <summary>
    /// Records the mailbox the stage at the given item index just minted. Re-recording the same mailbox is
    /// the idempotent replay of a mint and is accepted; a different mailbox for the same index throws rather
    /// than picking a winner.
    /// </summary>
    public void RecordMailbox(int stageIndex, Guid mailboxId, DateTimeOffset deadline)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(stageIndex);
        ArgumentOutOfRangeException.ThrowIfEqual(mailboxId, Guid.Empty, nameof(mailboxId));

        if (_mailboxes.TryGetValue(stageIndex, out CarriedMailbox? carried) && carried.Id != mailboxId)
        {
            throw new InvalidOperationException(
                $"The stage at index {stageIndex} already carries mailbox '{carried.Id}' and cannot also carry "
                    + $"'{mailboxId}'. A stage opens one mailbox, once."
            );
        }

        _mailboxes[stageIndex] = new CarriedMailbox { Id = mailboxId, Deadline = deadline };
    }

    /// <summary>
    /// The mailbox the stage at the given item index opened, or <c>null</c> when this workflow carries none
    /// for it.
    /// </summary>
    public CarriedMailbox? FindMailbox(int stageIndex) =>
        _mailboxes.TryGetValue(stageIndex, out CarriedMailbox? mailbox) ? mailbox : null;

    /// <summary>
    /// Every mailbox still traveling, ordered by opening stage index — what a conclusion that ends the whole
    /// task closes. A snapshot: recording a conclusion afterwards does not mutate it.
    /// </summary>
    public IReadOnlyList<(int StageIndex, CarriedMailbox Mailbox)> FindAllMailboxes() =>
        _mailboxes.OrderBy(kv => kv.Key).Select(kv => (kv.Key, kv.Value)).ToList();

    /// <summary>
    /// Records that the exchange the stage at the given item index opened has concluded, dropping its mailbox
    /// from the blob this callback publishes — the next transition may open a mailbox from a stage at the
    /// same index, which <see cref="RecordMailbox"/> would refuse over a stale entry.
    /// </summary>
    public void RecordMailboxConcluded(int stageIndex) => _mailboxes.Remove(stageIndex);
}
