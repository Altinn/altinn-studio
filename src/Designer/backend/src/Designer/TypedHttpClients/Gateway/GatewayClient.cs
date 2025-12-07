using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
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

        string apiToken = studioGatewaySettings.Token;
        string baseUri = studioGatewaySettings.GetBaseUri(org);
        string url = $"{baseUri}/alerts";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<StudioGatewayAlert>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string apiToken = studioGatewaySettings.Token;
        string baseUri = studioGatewaySettings.GetBaseUri(org);
        string url = $"{baseUri}/metrics?app={app}&time={time}";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<Metric>>(options, cancellationToken: cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<HealthMetric>> GetHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        StudioGatewayEnvSettings studioGatewaySettings = _studioGatewaySettings.GetSettings(env);

        string apiToken = studioGatewaySettings.Token;
        string baseUri = studioGatewaySettings.GetBaseUri(org);
        string url = $"{baseUri}/metrics/health?app={app}";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<HealthMetric>>(options, cancellationToken: cancellationToken) ?? [];
    }
}
