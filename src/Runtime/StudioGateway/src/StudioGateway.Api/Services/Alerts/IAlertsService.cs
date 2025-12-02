using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.Services.Alerts;

internal interface IAlertsService
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken);

    public Task UpsertFiringAlertsAsync(CancellationToken cancellationToken);
}
