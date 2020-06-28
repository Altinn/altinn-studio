using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Altinn.Platform.Storage.Health
{
    /// <summary>
    /// Health check service configured in startup https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
    /// Listen to 
    /// </summary>
    public class HealthCheck : IHealthCheck
    {
        /// <summary>
        /// Verifies the health status
        /// </summary>
        /// <param name="context">The healtcheck context</param>
        /// <param name="cancellationToken">The cancellationtoken</param>
        /// <returns>The health check result</returns>
        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                HealthCheckResult.Healthy("A healthy result."));
        }
    }
}
