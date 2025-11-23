using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.AlertsClient;

public interface IAlertsClient
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default);
}
