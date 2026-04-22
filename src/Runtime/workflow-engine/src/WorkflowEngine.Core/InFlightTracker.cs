using System.Collections.Concurrent;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// Thread-safe tracker of workflow IDs currently being processed by this host instance.
/// Used by <see cref="HeartbeatService"/> to batch-update heartbeats and by
/// <see cref="WorkflowProcessor"/> to register/unregister in-flight work.
/// Each tracked workflow is associated with a <see cref="CancellationTokenSource"/>
/// that can be triggered for explicit cancellation.
/// </summary>
internal sealed class InFlightTracker(TimeProvider timeProvider)
{
    private readonly ConcurrentDictionary<Guid, (CancellationTokenSource Cts, Workflow Workflow)> _workflows = new();
    private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _abandonedLeases = new();

    public bool IsEmpty => _workflows.IsEmpty;

    public bool TryAdd(Guid workflowId, CancellationTokenSource cts, Workflow workflow) =>
        _workflows.TryAdd(workflowId, (cts, workflow));

    public bool TryRemove(Guid workflowId, out CancellationTokenSource? cts)
    {
        if (_workflows.TryRemove(workflowId, out var entry))
        {
            // Compare-and-remove: only clear a marker that still matches our CTS, so a
            // marker belonging to a newer same-id attempt survives an ABA race.
            TryRemoveAbandonedLeaseIfOwned(workflowId, entry.Cts);
            cts = entry.Cts;
            return true;
        }

        cts = null;
        return false;
    }

    /// <summary>
    /// Attempts to cancel a single in-flight workflow by triggering its CTS.
    /// Also stamps <see cref="Workflow.CancellationRequestedAt"/> on the in-memory object
    /// so the handler can distinguish explicit cancellation from host shutdown.
    /// Returns true if the workflow was found and cancellation was requested.
    /// </summary>
    public bool TryCancel(Guid workflowId)
    {
        if (!_workflows.TryGetValue(workflowId, out var entry))
            return false;

        // Stamp the in-memory workflow before firing the CTS so the handler sees it
        entry.Workflow.CancellationRequestedAt ??= timeProvider.GetUtcNow();

        try
        {
            entry.Cts.Cancel();
        }
        catch (ObjectDisposedException)
        {
            // CTS was already disposed by the worker finishing — benign race
        }

        return true;
    }

    /// <summary>
    /// Batch-cancels multiple in-flight workflows.
    /// Used by <see cref="CancellationWatcherService"/> for cross-pod cancellation propagation.
    /// </summary>
    public void TryCancel(IReadOnlyList<Guid> workflowIds)
    {
        foreach (var id in workflowIds)
        {
            TryCancel(id);
        }
    }

    /// <summary>
    /// Abandons an in-flight workflow because its lease was reclaimed by another host.
    /// Cancels the CTS so the handler stops quickly, but does not stamp
    /// <see cref="Workflow.CancellationRequestedAt"/> — the workflow itself is not canceled,
    /// only this host's attempt to process it. The handler is expected to observe the
    /// resulting <c>LeaseLostException</c> on its next write-back and exit without retry.
    /// </summary>
    public void TryAbandonLostLease(IReadOnlyList<Guid> workflowIds)
    {
        foreach (var id in workflowIds)
        {
            if (!_workflows.TryGetValue(id, out var entry))
                continue;

            // Mark before cancelling so WasLeaseAbandoned is visible the instant the CT
            // registration fires on the awaiting Submit.
            _abandonedLeases[id] = entry.Cts;

            // If the workflow was concurrently removed or replaced between the TryGetValue
            // above and the marker store, drop our marker (compare-and-remove so a newer
            // attempt's marker is never touched).
            if (!_workflows.TryGetValue(id, out var current) || !ReferenceEquals(current.Cts, entry.Cts))
            {
                TryRemoveAbandonedLeaseIfOwned(id, entry.Cts);
                continue;
            }

            try
            {
                entry.Cts.Cancel();
            }
            catch (ObjectDisposedException)
            {
                // CTS was already disposed by the worker finishing — benign race
            }
        }
    }

    /// <summary>
    /// Returns <c>true</c> if the workflow's in-flight processing was abandoned by
    /// <see cref="TryAbandonLostLease"/>. Used by handlers to distinguish a race-induced
    /// <see cref="OperationCanceledException"/> (lease reclaimed by another host) from
    /// user-cancel or shutdown, so it can route the former to the lease-lost branch.
    /// </summary>
    public bool WasLeaseAbandoned(Guid workflowId) =>
        _workflows.TryGetValue(workflowId, out var entry)
        && _abandonedLeases.TryGetValue(workflowId, out var abandonedCts)
        && ReferenceEquals(abandonedCts, entry.Cts);

    private void TryRemoveAbandonedLeaseIfOwned(Guid workflowId, CancellationTokenSource cts) =>
        ((ICollection<KeyValuePair<Guid, CancellationTokenSource>>)_abandonedLeases).Remove(
            new KeyValuePair<Guid, CancellationTokenSource>(workflowId, cts)
        );

    public IReadOnlyList<Guid> GetSnapshotIds() => [.. _workflows.Keys];

    /// <summary>
    /// Snapshot of (workflowId, leaseToken) pairs for every in-flight workflow whose lease
    /// is still considered ours. Entries already flagged by <see cref="TryAbandonLostLease"/>
    /// are excluded — the new owner is processing them, and heartbeating them would only
    /// re-trigger the lost-id path on every sweep while the handler unwinds.
    /// </summary>
    /// <remarks>
    /// <c>FetchAndLockWorkflows</c> always stamps a fresh <c>LeaseToken</c>, so the
    /// <c>?? throw</c> is an invariant check, not a runtime code path.
    /// </remarks>
    public IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)> GetSnapshotLeases() =>
        _workflows
            .Where(kvp =>
                !_abandonedLeases.TryGetValue(kvp.Key, out var abandonedCts)
                || !ReferenceEquals(abandonedCts, kvp.Value.Cts)
            )
            .Select(kvp =>
                (
                    kvp.Key,
                    kvp.Value.Workflow.LeaseToken
                        ?? throw new InvalidOperationException(
                            $"Workflow {kvp.Key} tracked without a LeaseToken; expected FetchAndLockWorkflows to stamp one"
                        )
                )
            )
            .ToList();

    /// <summary>
    /// Attempts to retrieve the in-memory <see cref="Workflow"/> object for a tracked workflow.
    /// The returned object is the live reference being mutated by the processing pipeline,
    /// so its <see cref="Workflow.Steps"/> reflect real-time in-memory state (e.g. step status
    /// transitions to <see cref="Models.PersistentItemStatus.Processing"/> before command execution).
    /// </summary>
    public bool TryGetWorkflow(Guid workflowId, out Workflow? workflow)
    {
        if (_workflows.TryGetValue(workflowId, out var entry))
        {
            workflow = entry.Workflow;
            return true;
        }

        workflow = null;
        return false;
    }
}
