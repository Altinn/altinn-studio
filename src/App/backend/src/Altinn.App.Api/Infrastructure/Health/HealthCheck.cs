#nullable disable
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Altinn.App.Api.Infrastructure.Health;

/// <summary>
/// Health check service configured in startup https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
/// </summary>
public class HealthCheck : IHealthCheck
{
    /// <summary>
    /// Verifies the health status
    /// </summary>
    /// <param name="context">The healtcheck context</param>
    /// <param name="cancellationToken">The cancellationtoken</param>
    /// <returns>The health check result</returns>
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        return Task.FromResult(HealthCheckResult.Healthy("A healthy result."));
    }
}
