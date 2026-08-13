using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Services;

/// <summary>
/// Manual operator overrides for the namespace failure-storm circuit breaker, implemented by
/// <see cref="NamespaceThrottleService"/> so overrides reuse the sweep's own trip/close logic
/// instead of duplicating it. Both operations acquire the sweep's advisory lock (blocking, unlike
/// the sweep's try-only acquisition) before touching breaker state, so an override never
/// interleaves with a running sweep cycle — it waits its turn and then runs as the sole writer.
/// <para>
/// Overrides are one-shot interventions, not standing policy: a force-close does not prevent the
/// next sweep from re-tripping if the trip condition still holds, and a force-open does not
/// prevent canary-driven recovery. The existing per-workflow nudge and resume operations clear
/// <c>throttled_until</c> as well — an operator's explicit poke always wins over the breaker.
/// </para>
/// </summary>
internal interface INamespaceThrottleOperator
{
    /// <summary>
    /// Force-opens the breaker for a namespace: trips it immediately, regardless of the
    /// detection thresholds, using the sweep's trip semantics — state
    /// <see cref="NamespaceThrottleState.Open"/> with the configured initial window, fresh
    /// canaries on the normal retry schedule, and the rest of the <c>Requeued</c> population
    /// parked (jittered, deadline-clamped). Unconditional: an already-open breaker is re-tripped
    /// with the initial window and fresh canaries.
    /// </summary>
    Task<ThrottleForceOpenResult> ForceOpen(string ns, CancellationToken cancellationToken);

    /// <summary>
    /// Force-closes the breaker for a namespace: state <see cref="NamespaceThrottleState.Closed"/>
    /// and every <c>throttled_until</c> stamp in the namespace cleared immediately. The state row
    /// lingers through the normal closed grace period so stragglers parked by stale replica
    /// snapshots are still mopped up by the sweep.
    /// </summary>
    Task<ThrottleForceCloseResult> ForceClose(string ns, CancellationToken cancellationToken);
}

/// <summary>
/// Outcome of <see cref="INamespaceThrottleOperator.ForceOpen"/>.
/// </summary>
internal abstract record ThrottleForceOpenResult
{
    private ThrottleForceOpenResult() { }

    /// <summary>The breaker was tripped. Carries the resulting state row and how many workflows were parked.</summary>
    internal sealed record Opened(NamespaceThrottle Throttle, int ParkedCount) : ThrottleForceOpenResult;

    /// <summary>
    /// Throttling is disabled (<see cref="ThrottlingSettings.Enabled"/> is <c>false</c>): with the
    /// feature off the fetch gate ignores <c>throttled_until</c> entirely, so a force-open would
    /// be inert — the request is rejected instead of silently doing nothing.
    /// </summary>
    internal sealed record ThrottlingDisabled : ThrottleForceOpenResult;
}

/// <summary>
/// Outcome of <see cref="INamespaceThrottleOperator.ForceClose"/>.
/// </summary>
internal abstract record ThrottleForceCloseResult
{
    private ThrottleForceCloseResult() { }

    /// <summary>The breaker was closed. Carries the resulting state row and how many stamps were cleared.</summary>
    internal sealed record Closed(NamespaceThrottle Throttle, int ClearedCount) : ThrottleForceCloseResult;

    /// <summary>
    /// The breaker was already closed (idempotent replay). Any straggler stamps were still cleared.
    /// </summary>
    internal sealed record AlreadyClosed(NamespaceThrottle Throttle) : ThrottleForceCloseResult;

    /// <summary>No breaker state row exists for the namespace.</summary>
    internal sealed record NotFound : ThrottleForceCloseResult;

    /// <summary>
    /// Throttling is disabled — the sweep is not running, so a closed row would never serve out
    /// its grace period; the request is rejected with an explanation instead.
    /// </summary>
    internal sealed record ThrottlingDisabled : ThrottleForceCloseResult;
}
