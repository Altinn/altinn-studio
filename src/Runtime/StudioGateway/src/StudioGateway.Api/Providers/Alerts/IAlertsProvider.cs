using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.Providers.Alerts;

public interface IAlertsProvider
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default);
}
