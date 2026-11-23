namespace WorkflowEngine.Models;

/// <summary>
/// Coarse health level derived from <see cref="EngineHealthStatus"/> flags.
/// </summary>
public enum EngineHealthLevel
{
    /// <summary>
    /// The engine is operating normally.
    /// </summary>
    Healthy = 0,

    /// <summary>
    /// The engine is operating but with reduced capacity or transient issues.
    /// </summary>
    Degraded = 1,
}
