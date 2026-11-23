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
    /// The engine background processor is running.
    /// </summary>
    Running = 1 << 2,

    /// <summary>
    /// The active workflow inbox has reached its backpressure threshold.
    /// </summary>
    QueueFull = 1 << 4,

    /// <summary>
    /// The database is unreachable. The engine cannot process work.
    /// </summary>
    DatabaseUnavailable = 1 << 7,
}
