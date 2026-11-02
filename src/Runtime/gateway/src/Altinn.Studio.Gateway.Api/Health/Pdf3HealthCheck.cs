using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using OpenTelemetry;

namespace Altinn.Studio.Gateway.Api.Health;

/// <summary>
/// Checks that apps can reach pdf3. It calls the relay at the address apps call, so the request takes the
/// HTTPRoute apps' requests take. Without the route, the Service behind the address has no endpoints, and Linkerd
/// fails the request.
/// </summary>
internal sealed class Pdf3HealthCheck(
    IHttpClientFactory httpClientFactory,
    IOptionsMonitor<RuntimeHealthSettings> settings
) : IHealthCheck
{
    public const string Name = "pdf3";
    public const string HttpClientName = "pdf3-health";

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        var client = httpClientFactory.CreateClient(HttpClientName);

        // A check isn't traffic, and the gateway keeps every trace it starts.
        using var _ = SuppressInstrumentationScope.Begin();
        using var response = await client.GetAsync(settings.CurrentValue.Pdf3Url, cancellationToken);

        return response.IsSuccessStatusCode
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy($"The PDF address answered {(int)response.StatusCode}.");
    }
}
