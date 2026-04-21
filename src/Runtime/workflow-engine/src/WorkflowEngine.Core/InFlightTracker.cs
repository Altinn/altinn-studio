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

    // Workflows whose CTS was cancelled by TryAbandonLostLease specifically (not user-cancel
    // or shutdown). Used by handlers to translate a race-induced OperationCanceledException
    // into the lease-lost path so metrics and activity tags stay accurate.
    private readonly ConcurrentDictionary<Guid, byte> _abandonedLeases = new();

    public bool IsEmpty => _workflows.IsEmpty;

    public bool TryAdd(Guid workflowId, CancellationTokenSource cts, Workflow workflow) =>
        _workflows.TryAdd(workflowId, (cts, workflow));

    public bool TryRemove(Guid workflowId, out CancellationTokenSource? cts)
    {
        _abandonedLeases.TryRemove(workflowId, out _);

        if (_workflows.TryRemove(workflowId, out var entry))
        {
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

            // Mark before cancelling so WasLeaseAbandoned is observable the moment
            // the CT registration fires on the awaiting Submit.
            _abandonedLeases.TryAdd(id, 0);

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
    public bool WasLeaseAbandoned(Guid workflowId) => _abandonedLeases.ContainsKey(workflowId);

    public IReadOnlyList<Guid> GetSnapshotIds() => [.. _workflows.Keys];

    /// <summary>
    /// Snapshot of (workflowId, leaseToken) pairs for every in-flight workflow.
    /// Used by <see cref="HeartbeatService"/> to issue lease-checked heartbeats —
    /// a host that sent heartbeats without its lease token could keep a reclaimed
    /// workflow "alive" on the row and silently overwrite the new owner's state.
    /// </summary>
    /// <remarks>
    /// Tracked workflows always originate from <c>FetchAndLockWorkflows</c>, which stamps a
    /// fresh <c>LeaseToken</c> in the update CTE. The unwrap via <c>.Value</c> asserts that
    /// invariant; a null here would mean an untracked call path added a workflow without a lease.
    /// </remarks>
    // Non-null assertion: tracked workflows always originate from FetchAndLockWorkflows, which
    // stamps a fresh LeaseToken in the update CTE — so LeaseToken is guaranteed non-null here.
#pragma warning disable NX0003
    public IReadOnlyList<(Guid WorkflowId, Guid LeaseToken)> GetSnapshotLeases() =>
        _workflows.Select(kvp => (kvp.Key, kvp.Value.Workflow.LeaseToken!.Value)).ToList();
#pragma warning restore NX0003

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
