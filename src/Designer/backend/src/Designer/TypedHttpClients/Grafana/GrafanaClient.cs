using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClient.Grafana;

public class GrafanaClient(
    HttpClient httpClient,
    IOptions<GrafanaSettings> grafanaSettings
    ) : IGrafanaClient
{
    private readonly GrafanaSettings _grafanaSettings = grafanaSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<GrafanaAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        GrafanaEnvSettings grafanaSettings = _grafanaSettings.GetSettings(env);

        string apiToken = grafanaSettings.Token;
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        string baseUri = grafanaSettings.GetBaseUri(org);
        string url = $"{baseUri}/api/alertmanager/grafana/api/v2/alerts?active=true&silenced=false&inhibited=false";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<GrafanaAlert>>(options, cancellationToken: cancellationToken);
    }
}
