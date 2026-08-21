using Microsoft.Extensions.Options;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Services;

/// <summary>
/// Read-only in-memory snapshot of the open namespace breakers (failure-storm throttling),
/// refreshed by <see cref="NamespaceThrottleService"/> once per sweep cycle on every replica —
/// lock holder or not. This is the publication surface the workflow handler's cooperative parking
/// consumes: the handler never reads the state table and never judges, it only applies.
/// A snapshot can be stale by up to one sweep interval; the closed-state grace period on the
/// state row exists precisely to mop up after that staleness.
/// </summary>
internal interface IThrottleStateView
{
    /// <summary>
    /// The breakers currently in the <c>Open</c> state, as namespace → current throttle window.
    /// Deliberately excludes <c>HalfOpen</c>: during recovery, released workflows that fail again
    /// must stay unparked so they can accumulate into the sweep's re-trip signal — cooperative
    /// re-parking would hide exactly the evidence recovery is judged on.
    /// Reads as empty when the snapshot has expired (see
    /// <see cref="ThrottleStateView.StaleSnapshotSweepMultiplier"/>).
    /// </summary>
    IReadOnlyDictionary<string, TimeSpan> OpenBreakers { get; }
}

/// <inheritdoc cref="IThrottleStateView"/>
internal sealed class ThrottleStateView(TimeProvider timeProvider, IOptions<EngineSettings> options)
    : IThrottleStateView
{
    /// <summary>
    /// Snapshot age beyond which <see cref="OpenBreakers"/> reads as empty, as a multiple of
    /// <see cref="ThrottlingSettings.SweepInterval"/>. The view fails open, never closed: a
    /// replica whose sweep loop has died must lose its power to park, not keep exercising a
    /// frozen view — which would otherwise stamp workflows into a long-closed namespace after
    /// the grace-period row is gone, with nothing left to clear them. A stale snapshot merely
    /// returns parking duty to the sweep, the authoritative writer. Must stay below
    /// <see cref="NamespaceThrottleService.ClosedGraceSweepMultiplier"/> so stragglers parked at
    /// the staleness edge are still cleared by the grace-period sweep.
    /// </summary>
    internal const int StaleSnapshotSweepMultiplier = 3;

    private sealed record Snapshot(IReadOnlyDictionary<string, TimeSpan> OpenBreakers, DateTimeOffset PublishedAt);

    private static readonly IReadOnlyDictionary<string, TimeSpan> _empty = new Dictionary<string, TimeSpan>(
        StringComparer.Ordinal
    );

    private volatile Snapshot? _snapshot;

    /// <inheritdoc/>
    public IReadOnlyDictionary<string, TimeSpan> OpenBreakers
    {
        get
        {
            var snapshot = _snapshot;
            if (snapshot is null)
                return _empty;

            var maxAge = StaleSnapshotSweepMultiplier * options.Value.Throttling.SweepInterval;
            return timeProvider.GetUtcNow() - snapshot.PublishedAt > maxAge ? _empty : snapshot.OpenBreakers;
        }
    }

    /// <summary>
    /// Atomically replaces the snapshot, stamping its publication time. Called by the sweep only.
    /// </summary>
    internal void Publish(IReadOnlyDictionary<string, TimeSpan> openBreakers) =>
        _snapshot = new Snapshot(openBreakers, timeProvider.GetUtcNow());
}
