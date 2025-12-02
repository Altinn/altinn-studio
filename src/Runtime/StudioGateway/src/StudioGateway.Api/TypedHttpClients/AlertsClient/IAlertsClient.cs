using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.TypedHttpClients.AlertsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IAlertsClient
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken);
}
