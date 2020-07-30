using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Altinn.Studio.Designer.Health
{
    /// <summary>
    /// Health check service configured in startup https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
    /// Listen to 
    /// </summary>
    public class HealthCheck : IHealthCheck
    {
        /// <inheritdoc/>
        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                  HealthCheckResult.Healthy("A healthy result."));
        }
    }
}
