using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.Gateway;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class AlertsService(
    IGatewayClient gatewayClient,
    IHubContext<AlertsUpdatedHub, IAlertsUpdateClient> alertsUpdatedHubContext
    ) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<StudioGatewayAlert> alerts = await gatewayClient.GetFiringAlertsAsync(org, env, cancellationToken);

        return alerts.Select(alert => new Alert
        {
            Id = alert.Id,
            RuleId = alert.RuleId,
            Name = alert.Name,
            App = alert.App,
            Url = alert.Url
        });
    }

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(env));
    }
}
