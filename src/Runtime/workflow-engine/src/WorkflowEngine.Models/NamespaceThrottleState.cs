namespace WorkflowEngine.Models;

/// <summary>
/// Breaker state of a namespace throttle (per-namespace failure-storm circuit breaker).
/// </summary>
public enum NamespaceThrottleState
{
    /// <summary>
    /// The breaker is tripped: the namespace's <c>Requeued</c> population is parked behind
    /// <c>throttled_until</c> while canaries probe on the normal retry schedule.
    /// </summary>
    Open = 0,

    /// <summary>
    /// A canary progressed: the parked population is being released in exponentially growing
    /// oldest-first cohorts. A failed recovery re-trips back to <see cref="Open"/>.
    /// </summary>
    HalfOpen = 1,

    /// <summary>
    /// The breaker is closed (namespace healthy). The state row lingers in this state for a
    /// grace period so the sweep can clear stragglers parked by replicas holding a stale
    /// open-breaker snapshot — deleting the row at close would orphan them.
    /// </summary>
    Closed = 2,
}
