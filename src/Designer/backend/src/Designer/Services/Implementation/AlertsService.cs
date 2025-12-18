using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class AlertsService(
    IRuntimeGatewayClient runetimeGatewayClient,
    IHubContext<AlertsUpdatedHub, IAlertsUpdateClient> alertsUpdatedHubContext
    ) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        return await runetimeGatewayClient.GetAlertRulesAsync(org, environment, cancellationToken);
    }

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        await alertsUpdatedHubContext.Clients.Group(org).AlertsUpdated(new AlertsUpdated(environment.Name));
    }
}
