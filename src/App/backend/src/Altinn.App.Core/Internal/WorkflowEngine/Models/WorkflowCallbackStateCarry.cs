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

    /// <summary>
    /// The values each pipeline's stages recorded, keyed by <see cref="ServiceTaskValuesKey"/> or
    /// <see cref="SideEffectValuesKey"/>. A pipeline with no values has no entry.
    /// </summary>
    private readonly Dictionary<string, IReadOnlyDictionary<string, string>> _values = new(StringComparer.Ordinal);

    /// <summary>Side effects started before the commit, in the order they were started.</summary>
    private readonly List<PendingSideEffect> _pendingSideEffects = [];

    /// <summary>The shape of every workflow that has opened no mailbox and recorded no values.</summary>
    public WorkflowCallbackStateCarry() { }

    /// <summary>
    /// Restores the carry from an incoming blob. Mailbox keys must be canonical renderings of an item index —
    /// two spellings of one index would collapse into one entry and let the blob's last writer win.
    /// </summary>
    public WorkflowCallbackStateCarry(WorkflowCallbackState state)
    {
        if (state.PendingSideEffects is { } pending)
        {
            _pendingSideEffects.AddRange(pending);
        }

        if (state.Values is { } values)
        {
            foreach ((string pipeline, IReadOnlyDictionary<string, string> pipelineValues) in values)
            {
                if (pipelineValues.Count > 0)
                {
                    _values[pipeline] = pipelineValues;
                }
            }
        }

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

    /// <summary>
    /// Every pipeline's values in their blob shape, or <c>null</c> when no pipeline holds any — not an empty
    /// map, so the blob of a workflow that records none keeps the shape it always had.
    /// </summary>
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>>? Values =>
        _values.Count == 0
            ? null
            : new Dictionary<string, IReadOnlyDictionary<string, string>>(_values, StringComparer.Ordinal);

    /// <summary>The values the pipeline named by <paramref name="pipelineKey"/> holds, or <c>null</c> when none.</summary>
    public IReadOnlyDictionary<string, string>? FindValues(string pipelineKey) =>
        _values.TryGetValue(pipelineKey, out IReadOnlyDictionary<string, string>? values) ? values : null;

    /// <summary>
    /// Replaces the values the pipeline named by <paramref name="pipelineKey"/> holds. An empty set drops the
    /// pipeline's entry.
    /// </summary>
    public void RecordValues(string pipelineKey, IReadOnlyDictionary<string, string> values)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(pipelineKey);
        if (values.Count == 0)
        {
            _values.Remove(pipelineKey);
            return;
        }

        _values[pipelineKey] = values;
    }

    /// <summary>
    /// Drops the values of a pipeline that has concluded, so they stop traveling with the workflows after it.
    /// </summary>
    public void RecordValuesConcluded(string pipelineKey) => _values.Remove(pipelineKey);

    /// <summary>
    /// The side effects waiting to be enqueued, in their blob shape, or <c>null</c> when none is — not an empty
    /// list, so the blob of a workflow that starts none keeps the shape it always had.
    /// </summary>
    public IReadOnlyList<PendingSideEffect>? PendingSideEffects =>
        _pendingSideEffects.Count == 0 ? null : [.. _pendingSideEffects];

    /// <summary>Records side effects a step started, to be enqueued once the transition is saved.</summary>
    public void RecordStartedSideEffects(IEnumerable<PendingSideEffect> started) =>
        _pendingSideEffects.AddRange(started);

    /// <summary>
    /// Takes every side effect waiting to be enqueued, leaving none: the callback that enqueues them publishes a
    /// blob that no longer carries them, so no later step enqueues them again.
    /// </summary>
    public IReadOnlyList<PendingSideEffect> DrainPendingSideEffects()
    {
        List<PendingSideEffect> drained = [.. _pendingSideEffects];
        _pendingSideEffects.Clear();
        return drained;
    }

    /// <summary>The key a service task's pipeline records its values under.</summary>
    public static string ServiceTaskValuesKey(string serviceTaskType) => $"serviceTask:{serviceTaskType}";

    /// <summary>The key a side effect's pipeline records its values under.</summary>
    public static string SideEffectValuesKey(string sideEffectName) => $"sideEffect:{sideEffectName}";
}
