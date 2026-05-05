namespace WorkflowEngine.Models;

/// <summary>
/// Bitwise flags describing the engine's runtime state.
/// Aggregated by the health checks pipeline and projected to <see cref="EngineHealthLevel"/>.
/// </summary>
[Flags]
public enum EngineHealthStatus
{
    /// <summary>
    /// No flags set. Status is unknown.
    /// </summary>
    None = 0,

    /// <summary>
    /// The engine is healthy and able to process work.
    /// </summary>
    Healthy = 1 << 0,

    /// <summary>
    /// The engine is unhealthy and may be unable to process work.
    /// </summary>
    Unhealthy = 1 << 1,

    /// <summary>
    /// The engine background processor is running.
    /// </summary>
    Running = 1 << 2,

    /// <summary>
    /// The engine background processor has stopped.
    /// </summary>
    Stopped = 1 << 3,

    /// <summary>
    /// The active workflow inbox has reached its backpressure threshold.
    /// </summary>
    QueueFull = 1 << 4,

    /// <summary>
    /// The engine has been administratively disabled and will not pick up new work.
    /// </summary>
    Disabled = 1 << 5,

    /// <summary>
    /// The engine is running but has no in-flight work.
    /// </summary>
    Idle = 1 << 6,

    /// <summary>
    /// The database is unreachable. The engine cannot process work.
    /// </summary>
    DatabaseUnavailable = 1 << 7,
}
