using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.AlertsClient;

public class GrafanaClient(
    HttpClient httpClient,
    IOptions<AlertsClientSettings> alertsClientSettings
    ) : IAlertsClient
{
    private readonly AlertsClientSettings _alertsClientSettings = alertsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken)
    {
        string apiToken = _alertsClientSettings.Token;
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        string baseUri = _alertsClientSettings.BaseUri;
        string url = $"{baseUri}/api/alertmanager/grafana/api/v2/alerts?active=true&silenced=false&inhibited=false";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        var alerts = await response.Content.ReadFromJsonAsync<List<GrafanaAlert>>(options, cancellationToken: cancellationToken);

        return alerts.Select(alert =>
        {
            return new Alert
            {
                AlertId = alert.Fingerprint,
                AlertRuleId = alert.Labels["__alert_rule_uid__"],
                Type = alert.Labels.TryGetValue("Type", out string type) ? type : string.Empty, // Text = alert.Annotations["summary"].Replace("'", ""),
                App = "ttd" + alert.Labels["__name__"],
                // App = alert.Labels["cloud/rolename"],
                Url = BuildAlertLink(baseUri, alert)
            };
        });
    }

    private static string BuildAlertLink(string baseUri, GrafanaAlert alert)
    {
        if (alert.Annotations.TryGetValue("__dashboardUid__", out string dashboardId))
        {
            if (alert.Annotations.TryGetValue("__panelId__", out string panelId))
            {
                return $"{baseUri}/d/{dashboardId}/?viewPanel={panelId}";
            }

            return $"{baseUri}/d/{dashboardId}";
        }

        return alert.GeneratorURL;
    }
}
