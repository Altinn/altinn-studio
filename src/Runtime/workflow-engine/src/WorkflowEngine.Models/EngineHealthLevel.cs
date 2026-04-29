namespace WorkflowEngine.Models;

/// <summary>
/// Coarse health level derived from <see cref="EngineHealthStatus"/> flags.
/// Mirrors the ASP.NET <c>HealthStatus</c> tri-state without taking a dependency on the health checks package.
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

    /// <summary>
    /// The engine is unable to process work.
    /// </summary>
    Unhealthy = 2,
}
