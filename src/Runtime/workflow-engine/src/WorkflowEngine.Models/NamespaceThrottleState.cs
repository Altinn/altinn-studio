namespace WorkflowEngine.Models;

/// <summary>
/// Breaker state of a namespace throttle (per-namespace failure-storm circuit breaker).
/// <para>
/// The names describe what is happening to the namespace's workflows rather than the classic
/// circuit-breaker <c>Open</c>/<c>HalfOpen</c>/<c>Closed</c> triple, whose polarity inverts the
/// plain reading: a breaker that is "open" is the one that stops work.
/// </para>
/// </summary>
public enum NamespaceThrottleState
{
    /// <summary>
    /// The breaker has tripped: the namespace's <c>Requeued</c> population is parked behind
    /// <c>throttled_until</c> while canaries probe on the normal retry schedule.
    /// Equivalent to a classic breaker's <c>Open</c> state.
    /// </summary>
    Tripped = 0,

    /// <summary>
    /// A canary progressed: the parked population is being released in exponentially growing
    /// oldest-first cohorts. A failed recovery re-trips back to <see cref="Tripped"/>.
    /// Equivalent to a classic breaker's <c>HalfOpen</c> state.
    /// </summary>
    Recovering = 1,

    /// <summary>
    /// The namespace is healthy and nothing is parked. The state row lingers in this state for a
    /// grace period so the sweep can clear stragglers parked by replicas holding a stale
    /// tripped-breaker snapshot — deleting the row at recovery would orphan them.
    /// Equivalent to a classic breaker's <c>Closed</c> state.
    /// </summary>
    Clear = 2,
}
