using Altinn.Studio.Gateway.Api.Clients.K8s;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenTelemetry;

namespace Altinn.Studio.Gateway.Api.Health;

/// <summary>
/// Checks that apps can reach the Altinn Platform. It calls the platform's OpenID configuration, which every app reads
/// when it starts, on the host apps get for Storage from apps-config. Once that address is the platform proxy's, the
/// request takes the proxy, which adds a platform access token as it does for apps' requests.
/// </summary>
internal sealed class PlatformAccessHealthCheck(IHttpClientFactory httpClientFactory, AppsConfigClient appsConfig)
    : IHealthCheck
{
    public const string Name = "platform-access";
    public const string HttpClientName = "platform-access-health";

    /// <summary>
    /// Small, public and without side effects. Storage's own health endpoint isn't exposed on the platform's host.
    /// </summary>
    private const string OpenIdConfigurationPath = "/authentication/api/v1/openid/.well-known/openid-configuration";

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        // A check isn't traffic, and the gateway keeps every trace it starts.
        using var _ = SuppressInstrumentationScope.Begin();

        var storageEndpoint = await appsConfig.GetStorageEndpoint(cancellationToken);
        if (storageEndpoint is null)
        {
            return HealthCheckResult.Unhealthy("apps-config has no Storage address.");
        }

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var response = await client.GetAsync(CheckUrl(storageEndpoint), cancellationToken);

        return response.IsSuccessStatusCode
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy($"The platform answered {(int)response.StatusCode}.");
    }

    internal static Uri CheckUrl(Uri storageEndpoint) => new(storageEndpoint, OpenIdConfigurationPath);
}
