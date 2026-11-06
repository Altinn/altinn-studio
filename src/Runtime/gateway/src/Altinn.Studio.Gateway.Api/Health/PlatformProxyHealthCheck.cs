using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using OpenTelemetry;

namespace Altinn.Studio.Gateway.Api.Health;

/// <summary>
/// Checks that the platform proxy can reach the Altinn Platform with a platform access token. The proxy checks that its
/// certificate hasn't expired and calls the platform the way it forwards apps' requests. Apps don't call the platform
/// through the proxy yet, so the check calls the proxy's Service rather than an address from apps-config.
/// </summary>
internal sealed class PlatformProxyHealthCheck(
    IHttpClientFactory httpClientFactory,
    IOptions<RuntimeHealthSettings> settings
) : IHealthCheck
{
    public const string Name = "platform-proxy";
    public const string HttpClientName = "platform-proxy-health";

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        // A check isn't traffic, and the gateway keeps every trace it starts.
        using var _ = SuppressInstrumentationScope.Begin();

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var response = await client.GetAsync(HealthUrl(settings.Value.PlatformProxyAddress), cancellationToken);

        return response.IsSuccessStatusCode
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy($"The platform proxy answered {(int)response.StatusCode}.");
    }

    internal static Uri HealthUrl(Uri platformProxyAddress) => new(platformProxyAddress, "/health/platform");
}
