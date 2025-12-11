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
    IOptions<StudioGatewaySettings> studioGatewaySettings
    ) : IGatewayClient
{
    private readonly StudioGatewaySettings _studioGatewaySettings = studioGatewaySettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<StudioGatewayAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string baseUrl = studioGatewaySettings.GetBaseUrl(org);
        string url = $"{baseUrl}/alerts";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<StudioGatewayAlert>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        int time,
        CancellationToken cancellationToken
    )
    {
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string baseUrl = studioGatewaySettings.GetBaseUrl(org);
        string url = $"{baseUrl}/metrics?time={time}";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<Metric>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string baseUrl = studioGatewaySettings.GetBaseUrl(org);
        string url = $"{baseUrl}/metrics/app?app={app}&time={time}";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

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
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string baseUrl = studioGatewaySettings.GetBaseUrl(org);
        string url = $"{baseUrl}/metrics/app/health?app={app}";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<AppHealthMetric>>(options, cancellationToken: cancellationToken) ?? [];
    }
}
