namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// The health level the <see cref="EngineHealthStatus"/> bit field projects to.
/// </summary>
internal static class HealthStatusExtensions
{
    /// <summary>
    /// Degraded: the queue is full or the database is unavailable.
    /// </summary>
    internal const EngineHealthStatus DegradedMask =
        EngineHealthStatus.QueueFull | EngineHealthStatus.DatabaseUnavailable;

    extension(EngineHealthStatus status)
    {
        /// <summary>
        /// The <see cref="EngineHealthLevel"/> the flags amount to: degraded when any flag in
        /// <see cref="DegradedMask"/> is set.
        /// </summary>
        internal EngineHealthLevel ToHealthLevel() =>
            (status & DegradedMask) != 0 ? EngineHealthLevel.Degraded : EngineHealthLevel.Healthy;
    }
}
