using System.Globalization;

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
    /// Keyed by the opening stage's item index — the exchange's identity everywhere. Nothing here assumes the
    /// map holds at most one entry, even where today's builder does not forbid several.
    /// </summary>
    private readonly Dictionary<int, CarriedMailbox> _mailboxes = new();

    /// <summary>The shape of every workflow that has opened no mailbox.</summary>
    public WorkflowCallbackStateCarry() { }

    /// <summary>
    /// Restores the carry from an incoming blob. Keys must be <em>canonical</em> renderings of an item index —
    /// what <see cref="Mailboxes"/> writes — so <c>"00"</c> is refused rather than folded onto <c>"0"</c>:
    /// two spellings of one index would otherwise collapse into one entry here and let the blob's last writer
    /// silently win over the other exchange.
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
    /// The mailboxes still traveling, in their blob shape: keyed by the opening stage's item index as a string
    /// (JSON object keys are strings), or <c>null</c> when none is — not an empty map, so the blob a workflow
    /// with no exchange publishes keeps the shape it always had. A concluded exchange's mailbox is already gone
    /// from here (see <see cref="RecordMailboxConcluded"/>).
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
    /// Records the mailbox the stage at the given item index just minted, so the step that enqueues the first
    /// receiver can address it. Re-recording the same mailbox is the idempotent replay of a mint and is
    /// accepted; recording a <em>different</em> mailbox for the same index is unreachable by construction, and
    /// throws rather than picking a winner.
    /// </summary>
    /// <param name="stageIndex">The item index of the stage that opened it — the exchange's identity from here on.</param>
    /// <param name="mailboxId">The engine's id for the minted mailbox.</param>
    /// <param name="deadline">When the mailbox stops accepting messages.</param>
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
    /// Records that the exchange the stage at the given item index opened has concluded, which
    /// <strong>drops</strong> its mailbox from the blob this callback publishes. The one thing the mailbox
    /// must not outlive: the next transition inherits this blob and may open a mailbox from a stage at the
    /// same index, which <see cref="RecordMailbox"/> would refuse over a stale one. Concluding an exchange
    /// this workflow carries nothing for is a no-op — the blob names no mailbox either way.
    /// </summary>
    public void RecordMailboxConcluded(int stageIndex) => _mailboxes.Remove(stageIndex);
}
