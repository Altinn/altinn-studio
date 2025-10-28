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

public class GrafanaProvider(
    HttpClient httpClient,
    ISecretsClient secretsClient,
    IOptions<GeneralSettings> generalSettings
    ) : IAlertProvider
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly ISecretsClient _secretsClient = secretsClient;
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlerts(
        string org,
        string env,
        CancellationToken cancellationToken = default
    )
    {
        string apiToken = await _secretsClient.GetSecretAsync("GrafanaApiToken");
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiToken);

        string baseUrl = _generalSettings.GetGrafanaApiUrl(org, env);
        string url = $"{baseUrl}/api/alertmanager/grafana/api/v2/alerts?active=true&silenced=false&inhibited=false";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        HttpResponseMessage response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        List<GrafanaAlert> alerts = await response.Content.ReadFromJsonAsync<List<GrafanaAlert>>(options, cancellationToken: cancellationToken) ?? [];

        return alerts.Select(alert =>
        {
            return new Alert
            {
                AlertId = alert.Fingerprint,
                AlertRuleId = alert.Labels["__alert_rule_uid__"],
                Type = alert.Labels.TryGetValue("Type", out string type) ? type : string.Empty, // Text = alert.Annotations["summary"].Replace("'", ""),
                App = alert.Labels["cloud/rolename"],
                Url = alert.Annotations.TryGetValue("__dashboardUid__", out string dashboardId) ? alert.Annotations.TryGetValue("__panelId__", out string panelId) ? $"{baseUrl}/d/{dashboardId}/?viewPanel={panelId}" : $"{baseUrl}/d/{dashboardId}" : alert.GeneratorURL
            };
        });
    }
}
