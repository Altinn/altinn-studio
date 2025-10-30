using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.Grafana;

public interface IGrafanaClient
{
    public Task<IEnumerable<GrafanaAlert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default);
}
