using Altinn.Studio.Gateway.Api.Clients.K8s;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenTelemetry;

namespace Altinn.Studio.Gateway.Api.Health;

/// <summary>
/// Checks that apps can get PDFs. It calls the relay's health endpoint under the address apps call, so the request
/// takes the HTTPRoute their requests take, and the relay checks the shared pdf3 in DIS Core as far as a ready
/// worker. Without the route, the Service behind the address has no endpoints, and Linkerd fails the request.
/// </summary>
internal sealed class Pdf3HealthCheck(IHttpClientFactory httpClientFactory, AppsConfigClient appsConfig) : IHealthCheck
{
    public const string Name = "pdf3";
    public const string HttpClientName = "pdf3-health";

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        // A check isn't traffic, and the gateway keeps every trace it starts.
        using var _ = SuppressInstrumentationScope.Begin();

        var endpoint = await appsConfig.GetPdfEndpoint(cancellationToken);
        if (endpoint is null)
        {
            return HealthCheckResult.Unhealthy("apps-config has no PDF address.");
        }

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var response = await client.GetAsync(HealthUrl(endpoint), cancellationToken);

        return response.IsSuccessStatusCode
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy($"The PDF address answered {(int)response.StatusCode}.");
    }

    internal static Uri HealthUrl(Uri pdfEndpoint)
    {
        var url = new UriBuilder(pdfEndpoint) { Fragment = "" };
        url.Path = url.Path.TrimEnd('/') + "/health";
        return url.Uri;
    }
}
