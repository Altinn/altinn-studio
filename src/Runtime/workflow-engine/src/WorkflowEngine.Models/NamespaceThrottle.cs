namespace WorkflowEngine.Models;

/// <summary>
/// Persisted breaker state for one throttled namespace (per-namespace failure-storm circuit
/// breaker). The throttle sweep is the sole writer of this state; workflow handlers only ever
/// read a snapshot of the open breakers.
/// </summary>
public sealed record NamespaceThrottle
{
    /// <summary>
    /// The namespace this breaker guards. One row per namespace.
    /// </summary>
    public required string Namespace { get; init; }

    /// <summary>
    /// Current breaker state. A <see cref="NamespaceThrottleState.Clear"/> row lingers for a
    /// grace period instead of being deleted, so stragglers parked by stale replica snapshots
    /// can still be cleared by the sweep.
    /// </summary>
    public NamespaceThrottleState State { get; set; }

    /// <summary>
    /// When the breaker last tripped.
    /// </summary>
    public DateTimeOffset TrippedAt { get; set; }

    /// <summary>
    /// The current throttle window applied to parked workflows. Grows exponentially on every
    /// extension (persisted so window memory survives re-trips), capped at
    /// <see cref="ThrottlingSettings.MaxWindow"/>.
    /// </summary>
    public TimeSpan CurrentWindow { get; set; }

    /// <summary>
    /// The canary workflows currently probing recovery, with their requeue counts recorded at
    /// selection. Progress is judged against the recorded count, which makes the check race-free
    /// against a canary being mid-attempt at sweep time.
    /// </summary>
    public IReadOnlyList<ThrottleCanary> Canaries { get; set; } = [];

    /// <summary>
    /// When the sweep last evaluated this namespace.
    /// </summary>
    public DateTimeOffset? LastEvaluatedAt { get; set; }

    /// <summary>
    /// The namespace's <c>Requeued</c> workflow count observed at the last evaluation.
    /// </summary>
    public int LastRequeuedCount { get; set; }

    /// <summary>
    /// The namespace's active (incomplete) workflow count observed at the last evaluation —
    /// the denominator of the <see cref="ThrottlingSettings.MinRequeuedRatio"/> trip condition.
    /// </summary>
    public int LastActiveCount { get; set; }

    /// <summary>
    /// Last time this row was updated by the sweep.
    /// </summary>
    public DateTimeOffset? UpdatedAt { get; set; }
}

/// <summary>
/// A canary workflow probing recovery for a throttled namespace: the workflow id and its requeue
/// count recorded when it was selected as a canary.
/// </summary>
/// <param name="WorkflowId">Id of the workflow serving as a canary.</param>
/// <param name="RequeueCount">The current step's requeue count recorded at selection — the
/// baseline a later observation is compared against, which is what makes the canary verdict
/// race-free against the canary being mid-attempt at sweep time.</param>
public sealed record ThrottleCanary(Guid WorkflowId, int RequeueCount);
