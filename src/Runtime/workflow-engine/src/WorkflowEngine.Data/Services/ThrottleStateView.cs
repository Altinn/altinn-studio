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
    /// </summary>
    IReadOnlyDictionary<string, TimeSpan> OpenBreakers { get; }
}

/// <inheritdoc cref="IThrottleStateView"/>
internal sealed class ThrottleStateView : IThrottleStateView
{
    private static readonly IReadOnlyDictionary<string, TimeSpan> _empty = new Dictionary<string, TimeSpan>(
        StringComparer.Ordinal
    );

    private volatile IReadOnlyDictionary<string, TimeSpan> _openBreakers = _empty;

    /// <inheritdoc/>
    public IReadOnlyDictionary<string, TimeSpan> OpenBreakers => _openBreakers;

    /// <summary>
    /// Atomically replaces the snapshot. Called by the sweep only.
    /// </summary>
    internal void Publish(IReadOnlyDictionary<string, TimeSpan> openBreakers) => _openBreakers = openBreakers;
}
