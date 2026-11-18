namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Predicates over the <see cref="EngineHealthStatus"/> bit field, and the health level it projects to.
/// </summary>
public static class HealthStatusExtensions
{
    /// <summary>
    /// Unhealthy: the engine is stopped or explicitly unhealthy.
    /// </summary>
    internal const EngineHealthStatus UnhealthyMask = EngineHealthStatus.Unhealthy | EngineHealthStatus.Stopped;

    /// <summary>
    /// Degraded: the engine is disabled, the queue is full, or the database is unavailable.
    /// </summary>
    internal const EngineHealthStatus DegradedMask =
        EngineHealthStatus.Disabled | EngineHealthStatus.QueueFull | EngineHealthStatus.DatabaseUnavailable;

    extension(EngineHealthStatus status)
    {
        /// <summary>
        /// Returns <c>true</c> when <see cref="EngineHealthStatus.Disabled"/> is set.
        /// </summary>
        public bool IsDisabled() => (status & EngineHealthStatus.Disabled) != 0;

        /// <summary>
        /// Returns <c>true</c> when the engine is <see cref="EngineHealthStatus.Running"/> and not flagged <see cref="EngineHealthStatus.Unhealthy"/>.
        /// </summary>
        public bool IsHealthy() =>
            (status & EngineHealthStatus.Running) != 0 && (status & EngineHealthStatus.Unhealthy) == 0;

        /// <summary>
        /// Returns <c>true</c> when <see cref="EngineHealthStatus.QueueFull"/> is set.
        /// </summary>
        public bool HasFullQueue() => (status & EngineHealthStatus.QueueFull) != 0;

        /// <summary>
        /// The <see cref="EngineHealthLevel"/> the flags amount to: unhealthy when any flag in
        /// <see cref="UnhealthyMask"/> is set, otherwise degraded when any flag in <see cref="DegradedMask"/> is set.
        /// </summary>
        internal EngineHealthLevel ToHealthLevel()
        {
            if ((status & UnhealthyMask) != 0)
                return EngineHealthLevel.Unhealthy;

            if ((status & DegradedMask) != 0)
                return EngineHealthLevel.Degraded;

            return EngineHealthLevel.Healthy;
        }
    }
}
