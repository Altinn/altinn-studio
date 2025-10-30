using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClient.StudioGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AlertsService(
    IStudioGatewayClient studioGatewayClient
    ) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    )
    {
        IEnumerable<StudioGatewayAlert> alerts = await studioGatewayClient.GetFiringAlertsAsync(org, env, cancellationToken);

        return alerts.Select(alert => new Alert
        {
            AlertId = alert.AlertId,
            AlertRuleId = alert.AlertRuleId,
            Type = alert.Type,
            App = alert.App,
            Url = alert.Url
        });
    }
}
