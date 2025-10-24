using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Secrets;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AlertsService(
    HttpClient httpClient,
    ISecretsClient secretsClient,
    IOptions<GeneralSettings> generalSettings
    ) : IAlertsService
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly ISecretsClient _secretsClient = secretsClient;
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlerts(
        string org,
        string env,
        CancellationToken ct
    )
    {
        string apiToken = await _secretsClient.GetSecretAsync("grafana-api-token");
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiToken);

        string baseUrl = _generalSettings.GetGrafanaApiUrl(org, env);
        string url = $"{baseUrl}/api/alertmanager/grafana/api/v2/alerts?active=true&silenced=false&inhibited=false";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        HttpResponseMessage response = await _httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        List<GrafanaAlert> alerts = await response.Content.ReadFromJsonAsync<List<GrafanaAlert>>(options) ?? [];

        return alerts.Select(alert => new Alert
        {
            Id = alert.Labels["__alert_rule_uid__"], // alert.Fingerprint,
            Type = alert.Labels["Type"], // Text = alert.Annotations["summary"].Replace("'", ""),
            App = "ttd" + alert.Labels["__name__"] // alert.Labels["cloud/rolename"],
        });
    }
}
