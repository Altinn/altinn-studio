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
            .Alerts.Where(alertInstance => alertInstance.Status == "firing")
            .Select(alertInstance => alertInstance.App)
            .ToList();

        if (apps.Count > 0)
        {
            var payload = new AlertNotificationPayload(org, environment, apps, alert, hostEnvironment);
            await Task.WhenAll(
                notificationService.NotifyInternalAsync(org, environment, payload, cancellationToken),
                notificationService.NotifyServiceOwnersAsync(org, environment, payload, cancellationToken)
            );
        }

        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }
}
