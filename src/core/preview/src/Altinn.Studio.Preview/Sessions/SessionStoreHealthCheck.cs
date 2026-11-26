using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// Whether the service reaches its sessions. Without them it can neither start a session nor serve one, so a pod whose
/// Redis is down, or refuses its password, is not ready. The health check service reports the exception of a failed
/// read as unhealthy.
/// </summary>
internal sealed class SessionStoreHealthCheck(SessionStore sessionStore) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        // The Redis client doesn't stop connecting when the token is cancelled, so the check stops waiting instead, at
        // the check's timeout.
        await sessionStore.CheckReachable(cancellationToken).WaitAsync(cancellationToken);
        return HealthCheckResult.Healthy();
    }
}
