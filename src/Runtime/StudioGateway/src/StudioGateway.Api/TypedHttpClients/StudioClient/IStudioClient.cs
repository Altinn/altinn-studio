using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.TypedHttpClients.StudioClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IStudioClient
{
    public Task UpsertFiringAlertsAsync(CancellationToken cancellationToken);
}
