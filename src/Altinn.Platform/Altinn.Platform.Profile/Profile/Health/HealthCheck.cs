using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Altinn.Platform.Profile.Health
{
    /// <summary>
    /// Health check service configured in startup
    /// Listen to 
    /// </summary>
    public class HealthCheck : IHealthCheck
    {
        /// <summary>
        /// Verifies the healht status
        /// </summary>
        /// <param name="context">The healtcheck context</param>
        /// <param name="cancellationToken">A cancellation token</param>
        /// <returns>A health result</returns>
        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(HealthCheckResult.Healthy("A healthy result."));
        }
    }
}
