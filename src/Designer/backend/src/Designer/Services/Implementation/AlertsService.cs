using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class AlertsService(
    IRuntimeGatewayClient runtimeGatewayClient,
    IHubContext<AlertsUpdatedHub, IAlertsUpdateClient> alertsUpdatedHubContext,
    INotificationService notificationService,
    IHostEnvironment hostEnvironment
) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetAlertRulesAsync(org, environment, cancellationToken);
    }

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(
        string org,
        AltinnEnvironment environment,
        Alert alert,
        CancellationToken cancellationToken
    )
    {
        var apps = alert
            .Apps.Where(app => app.Instances.Any(i => i.Status == "firing"))
            .Select(app => app.App)
            .ToList();

        if (apps.Count > 0)
        {
            var fields = new List<(string, string)>
            {
                ("Organisasjon", org),
                ("Miljø", environment.Name),
                (apps.Count == 1 ? "Applikasjon" : "Applikasjoner", string.Join(", ", apps)),
            };
            if (!hostEnvironment.IsProduction())
            {
                fields.Add(("Studio-miljø", hostEnvironment.EnvironmentName));
            }

            var links = new List<(string, string)>
            {
                (alert.Url.OriginalString, "Grafana"),
                (alert.LogsUrl.OriginalString, "Application Insights"),
            };

            var payload = new NotificationPayload(alert.Id, alert.Name, fields, links);
            await Task.WhenAll(
                notificationService.NotifyInternalAsync(org, environment, payload, cancellationToken),
                notificationService.NotifyServiceOwnersAsync(org, environment, payload, cancellationToken)
            );
        }

        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }
}
