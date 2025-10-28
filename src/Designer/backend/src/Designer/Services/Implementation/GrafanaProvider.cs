using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClient.Grafana;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GrafanaProvider(
    IGrafanaClient grafanaClient,
    IOptions<GrafanaSettings> grafanaSettings
    ) : IAlertProvider
{
    private readonly GrafanaSettings _grafanaSettings = grafanaSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        string baseUrl = _grafanaSettings.GetSettings(env).GetBaseUri(org);

        IEnumerable<GrafanaAlert> alerts = await grafanaClient.GetFiringAlertsAsync(org, env, cancellationToken);

        return alerts.Select(alert =>
        {
            return new Alert
            {
                AlertId = alert.Fingerprint,
                AlertRuleId = alert.Labels["__alert_rule_uid__"],
                Type = alert.Labels.TryGetValue("Type", out string type) ? type : string.Empty, // Text = alert.Annotations["summary"].Replace("'", ""),
                App = alert.Labels["cloud/rolename"],
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
