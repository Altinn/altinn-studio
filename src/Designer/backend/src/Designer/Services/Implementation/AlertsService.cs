using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClient.StudioGateway;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AlertsService(
    IStudioGatewayClient studioGatewayClient,
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
        IEnumerable<StudioGatewayAlert> alerts = await studioGatewayClient.GetFiringAlertsAsync(org, env, cancellationToken);

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
    public async Task UpsertFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(env));
    }
}
