using Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;

namespace Altinn.Studio.Gateway.Api.Clients.AlertsClient;

internal interface IAlertsClient
{
    public Task<IEnumerable<GrafanaAlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken);
}
