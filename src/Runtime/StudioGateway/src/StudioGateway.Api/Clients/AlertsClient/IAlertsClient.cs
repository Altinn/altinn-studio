using StudioGateway.Api.Clients.AlertsClient.Contracts;

namespace StudioGateway.Api.Clients.AlertsClient;

internal interface IAlertsClient
{
    public Task<IEnumerable<GrafanaAlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken);
}
