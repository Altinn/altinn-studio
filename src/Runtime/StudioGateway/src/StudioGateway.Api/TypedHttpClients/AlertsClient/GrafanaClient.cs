using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.AlertsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class GrafanaClient(HttpClient httpClient, IOptions<AlertsClientSettings> alertsClientSettings)
    : IAlertsClient
{
    private readonly AlertsClientSettings _alertsClientSettings = alertsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken)
    {
        string apiToken = _alertsClientSettings.Token;
        string baseUrl = _alertsClientSettings.BaseUrl;
        string url = $"{baseUrl}/api/alertmanager/grafana/api/v2/alerts?active=true&silenced=false&inhibited=false";

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        HttpResponseMessage response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var alerts = await response.Content.ReadFromJsonAsync<List<GrafanaAlert>>(
            options,
            cancellationToken: cancellationToken
        );

        return alerts?.Select(alert =>
            {
                return new Alert
                {
                    Id = alert.Fingerprint,
                    RuleId = alert.Labels.TryGetValue("RuleId", out string? ruleId)
                        ? ruleId
                        : alert.Labels["__alert_rule_uid__"],
                    Name = alert.Labels["alertname"],
                    App = alert.Labels.TryGetValue("__name__", out string? appName) ? appName : string.Empty,
                    Url = new Uri(BuildAlertLink(baseUrl, alert)),
                };
            }) ?? [];
    }

    private static string BuildAlertLink(string baseUri, GrafanaAlert alert)
    {
        if (
            alert.Annotations.TryGetValue("__dashboardUid__", out string? dashboardId)
            && !string.IsNullOrEmpty(dashboardId)
        )
        {
            if (alert.Annotations.TryGetValue("__panelId__", out string? panelId) && !string.IsNullOrEmpty(panelId))
            {
                return $"{baseUri}/d/{dashboardId}/?viewPanel={panelId}";
            }

            return $"{baseUri}/d/{dashboardId}";
        }

        return alert.GeneratorURL ?? string.Empty;
    }
}
