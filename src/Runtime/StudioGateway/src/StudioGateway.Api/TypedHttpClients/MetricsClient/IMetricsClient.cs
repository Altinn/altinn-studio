using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.MetricsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IMetricsClient
{
    public Task<IEnumerable<Metric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken);
}
