using Microsoft.Extensions.Diagnostics.HealthChecks;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Core;

internal sealed class EngineHealthCheck(IEngineStatus engineStatus, IConcurrencyLimiter concurrencyLimiter)
    : IHealthCheck
{
    /// <summary>
    /// Unhealthy: the engine is stopped or explicitly unhealthy.
    /// </summary>
    private const EngineHealthStatus UnhealthyMask = EngineHealthStatus.Unhealthy | EngineHealthStatus.Stopped;

    /// <summary>
    /// Degraded: the engine is disabled or the queue is full.
    /// </summary>
    private const EngineHealthStatus DegradedMask = EngineHealthStatus.Disabled | EngineHealthStatus.QueueFull;

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        var dbSlotStatus = concurrencyLimiter.DbSlotStatus;
        var httpSlotStatus = concurrencyLimiter.HttpSlotStatus;

        var data = new Dictionary<string, object>
        {
            ["status"] = engineStatus.Status.ToString(),
            ["workers"] = new Dictionary<string, int>
            {
                ["active"] = engineStatus.ActiveWorkerCount,
                ["max"] = engineStatus.MaxWorkers,
            },
            ["http_connections"] = new Dictionary<string, int>
            {
                ["count"] = httpSlotStatus.Used,
                ["limit"] = httpSlotStatus.Total,
            },
            ["db_connections"] = new Dictionary<string, int>
            {
                ["count"] = dbSlotStatus.Used,
                ["limit"] = dbSlotStatus.Total,
            },
            ["queue"] = new Dictionary<string, int>
            {
                ["active_workflows"] = engineStatus.ActiveWorkflowCount,
                ["scheduled_workflows"] = engineStatus.ScheduledWorkflowCount,
                ["failed_workflows"] = engineStatus.FailedWorkflowCount,
            },
        };

        var status = new
        {
            IsUnhealthy = (engineStatus.Status & UnhealthyMask) != 0,
            IsDegraded = (engineStatus.Status & DegradedMask) != 0,
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
