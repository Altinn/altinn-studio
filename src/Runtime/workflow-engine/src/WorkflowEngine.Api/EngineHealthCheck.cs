using Microsoft.Extensions.Diagnostics.HealthChecks;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal sealed class EngineHealthCheck(IEngine engine) : IHealthCheck
{
    /// <summary>
    /// Unhealthy: engine is stopped or explicitly unhealthy.
    /// </summary>
    private const EngineHealthStatus UnhealthyMask = EngineHealthStatus.Unhealthy | EngineHealthStatus.Stopped;

    /// <summary>
    /// Degraded: engine is disabled or queue is full.
    /// </summary>
    private const EngineHealthStatus DegradedMask = EngineHealthStatus.Disabled | EngineHealthStatus.QueueFull;

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        var data = new Dictionary<string, object>
        {
            ["status"] = engine.Status.ToString(),
            ["queue"] = engine.InboxCount,
        };

        var status = new
        {
            IsUnhealthy = (engine.Status & UnhealthyMask) != 0,
            IsDegraded = (engine.Status & DegradedMask) != 0,
        };

        var result = status switch
        {
            { IsUnhealthy: true } => HealthCheckResult.Unhealthy("Engine is unhealthy", data: data),
            { IsDegraded: true } => HealthCheckResult.Degraded("Engine is degraded", data: data),
            _ => HealthCheckResult.Healthy("Engine is operational", data: data),
        };

        return Task.FromResult(result);
    }
}
