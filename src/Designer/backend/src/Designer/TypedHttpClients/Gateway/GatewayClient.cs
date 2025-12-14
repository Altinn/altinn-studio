using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClients.Gateway;

internal sealed class GatewayClient(
    HttpClient httpClient,
    IOptions<GatewaySettings> gatewaySettings
    ) : IGatewayClient
{
    private readonly GatewaySettings _gatewaySettings = gatewaySettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<StudioGatewayAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        string baseUrl = _gatewaySettings.GetBaseUrl(org, env);
        string url = $"{baseUrl}/alerts";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };
        return await response.Content.ReadFromJsonAsync<List<StudioGatewayAlert>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        int range,
        CancellationToken cancellationToken
    )
    {
        string baseUrl = _gatewaySettings.GetBaseUrl(org, env);
        string url = $"{baseUrl}/metrics?range={range}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };
        return await response.Content.ReadFromJsonAsync<List<Metric>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        string env,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        string baseUrl = _gatewaySettings.GetBaseUrl(org, env);
        string url = $"{baseUrl}/metrics/app?app={app}&range={range}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };
        return await response.Content.ReadFromJsonAsync<List<AppMetric>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        string baseUrl = _gatewaySettings.GetBaseUrl(org, env);
        string url = $"{baseUrl}/metrics/app/health?app={app}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };
        return await response.Content.ReadFromJsonAsync<List<AppHealthMetric>>(options, cancellationToken: cancellationToken) ?? [];
    }
}
