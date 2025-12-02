using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.Services.Alerts;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IAlertsService
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken);

    public Task UpsertFiringAlertsAsync(CancellationToken cancellationToken);
}
