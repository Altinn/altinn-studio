using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.Services.Alerts;

public interface IAlertsService
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default);

    public Task UpsertFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );
}
