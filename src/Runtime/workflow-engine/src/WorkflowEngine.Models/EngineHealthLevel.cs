namespace WorkflowEngine.Models;

/// <summary>
/// Coarse health level derived from <see cref="EngineHealthStatus"/> flags.
/// Mirrors the ASP.NET <c>HealthStatus</c> tri-state without taking a dependency on the health checks package.
/// </summary>
public enum EngineHealthLevel
{
    Healthy = 0,
    Degraded = 1,
    Unhealthy = 2,
}
