using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Services;

/// <summary>
/// Manual operator overrides for the namespace failure-storm circuit breaker, implemented by
/// <see cref="NamespaceThrottleService"/> so overrides reuse the sweep's own trip/clear logic
/// instead of duplicating it. Both operations acquire the sweep's advisory lock (blocking, unlike
/// the sweep's try-only acquisition) before touching breaker state, so an override never
/// interleaves with a running sweep cycle — it waits its turn and then runs as the sole writer.
/// <para>
/// Overrides are one-shot interventions, not standing policy: a force-clear does not prevent the
/// next sweep from re-tripping if the trip condition still holds, and a force-trip does not
/// prevent canary-driven recovery. The existing per-workflow nudge and resume operations clear
/// <c>throttled_until</c> as well — an operator's explicit poke always wins over the breaker.
/// </para>
/// </summary>
internal interface INamespaceThrottleOperator
{
    /// <summary>
    /// Force-trips the breaker for a namespace: trips it immediately, regardless of the
    /// detection thresholds, using the sweep's trip semantics — state
    /// <see cref="NamespaceThrottleState.Tripped"/> with the configured initial window, fresh
    /// canaries on the normal retry schedule, and the rest of the <c>Requeued</c> population
    /// parked (jittered, deadline-clamped). Unconditional: an already-tripped breaker is re-tripped
    /// with the initial window and fresh canaries.
    /// </summary>
    Task<ThrottleForceTripResult> ForceTrip(string ns, CancellationToken cancellationToken);

    /// <summary>
    /// Force-clears the breaker for a namespace: state <see cref="NamespaceThrottleState.Clear"/>
    /// and every <c>throttled_until</c> stamp in the namespace cleared immediately. The state row
    /// lingers through the normal cleared grace period so stragglers parked by stale replica
    /// snapshots are still mopped up by the sweep.
    /// </summary>
    Task<ThrottleForceClearResult> ForceClear(string ns, CancellationToken cancellationToken);
}

/// <summary>
/// Outcome of <see cref="INamespaceThrottleOperator.ForceTrip"/>.
/// </summary>
internal abstract record ThrottleForceTripResult
{
    private ThrottleForceTripResult() { }

    /// <summary>The breaker was tripped. Carries the resulting state row and how many workflows were parked.</summary>
    internal sealed record Tripped(NamespaceThrottle Throttle, int ParkedCount) : ThrottleForceTripResult;

    /// <summary>
    /// Throttling is disabled (<see cref="ThrottlingSettings.Enabled"/> is <c>false</c>): with the
    /// feature off the fetch gate ignores <c>throttled_until</c> entirely, so a force-trip would
    /// be inert — the request is rejected instead of silently doing nothing.
    /// </summary>
    internal sealed record ThrottlingDisabled : ThrottleForceTripResult;
}

/// <summary>
/// Outcome of <see cref="INamespaceThrottleOperator.ForceClear"/>.
/// </summary>
internal abstract record ThrottleForceClearResult
{
    private ThrottleForceClearResult() { }

    /// <summary>The breaker was cleared. Carries the resulting state row and how many stamps were cleared.</summary>
    internal sealed record Cleared(NamespaceThrottle Throttle, int ClearedCount) : ThrottleForceClearResult;

    /// <summary>
    /// The breaker was already clear (idempotent replay). Any straggler stamps were still cleared.
    /// </summary>
    internal sealed record AlreadyClear(NamespaceThrottle Throttle) : ThrottleForceClearResult;

    /// <summary>No breaker state row exists for the namespace.</summary>
    internal sealed record NotFound : ThrottleForceClearResult;

    /// <summary>
    /// Throttling is disabled — the sweep is not running, so a cleared row would never serve out
    /// its grace period; the request is rejected with an explanation instead.
    /// </summary>
    internal sealed record ThrottlingDisabled : ThrottleForceClearResult;
}
