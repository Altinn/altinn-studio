namespace WorkflowEngine.Data.Constants;

/// <summary>
/// Well-known PostgreSQL advisory lock keys used by the engine. Advisory locks are global to the
/// database, so every distributed-mutual-exclusion key lives here — one place to see they cannot
/// collide.
/// </summary>
internal static class AdvisoryLockIds
{
    /// <summary>
    /// Serializes schema migrations across replicas (<see cref="Services.DbMigrationService"/>).
    /// Acquisition blocks: every starting replica waits its turn and then observes an up-to-date
    /// schema.
    /// </summary>
    internal const long Migration = 0x4D6967726174; // "Migrat" in hex

    /// <summary>
    /// Makes the namespace throttle sweep a single writer across replicas
    /// (<see cref="Services.NamespaceThrottleService"/>). Acquisition is try-only: a replica that
    /// finds the lock held skips its cycle — the sweep is periodic, so queuing up behind the
    /// holder would only produce redundant back-to-back sweeps.
    /// </summary>
    internal const long ThrottleSweep = 0x5468726F74; // "Throt" in hex
}
