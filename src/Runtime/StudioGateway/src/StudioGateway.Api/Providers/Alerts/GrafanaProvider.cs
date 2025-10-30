using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models;
using StudioGateway.Api.Services.Alerts;
using StudioGateway.Api.TypedHttpClients.Grafana;

namespace StudioGateway.Api.Providers.Alerts;

public class GrafanaProvider(
    IGrafanaClient grafanaClient,
    IOptions<GrafanaSettings> grafanaSettings
    ) : IAlertsProvider
{
    private readonly GrafanaSettings _grafanaSettings = grafanaSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        string baseUrl = _grafanaSettings.GetBaseUri(org);

        IEnumerable<GrafanaAlert> alerts = await grafanaClient.GetFiringAlertsAsync(org, env, cancellationToken);

        return alerts.Select(alert =>
        {
            return new Alert
            {
                AlertId = alert.Fingerprint,
                AlertRuleId = alert.Labels["__alert_rule_uid__"],
                Type = alert.Labels.TryGetValue("Type", out string type) ? type : string.Empty, // Text = alert.Annotations["summary"].Replace("'", ""),
                App = "ttd" + alert.Labels["__name__"],
                // App = alert.Labels["cloud/rolename"],
                Url = BuildAlertLink(baseUrl, alert)
            };
        });
    }

    private static string BuildAlertLink(string baseUrl, GrafanaAlert alert)
    {
        if (alert.Annotations.TryGetValue("__dashboardUid__", out string dashboardId))
        {
            if (alert.Annotations.TryGetValue("__panelId__", out string panelId))
            {
                return $"{baseUrl}/d/{dashboardId}/?viewPanel={panelId}";
            }

            return $"{baseUrl}/d/{dashboardId}";
        }

        return alert.GeneratorURL;
    }
}
