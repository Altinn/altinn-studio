using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.AppClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IAppClient
{
    public Task<HealthMetric> GetHealthAsync(string app, CancellationToken cancellationToken);
}
