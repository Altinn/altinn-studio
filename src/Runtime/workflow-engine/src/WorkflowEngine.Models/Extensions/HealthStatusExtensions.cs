namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Convenience predicates over the <see cref="EngineHealthStatus"/> bit field.
/// </summary>
public static class HealthStatusExtensions
{
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
    }
}
