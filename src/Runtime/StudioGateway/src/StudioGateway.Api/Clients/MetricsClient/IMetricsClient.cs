using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Clients.MetricsClient.Contracts;
using StudioGateway.Contracts.Metrics;

namespace StudioGateway.Api.Clients.MetricsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IMetricsClient
{
    public Task<IEnumerable<AzureMonitorMetric>> GetMetricsAsync(int range, CancellationToken cancellationToken);
    public Task<IEnumerable<AppMetric>> GetAppMetricsAsync(string app, int range, CancellationToken cancellationToken);
}
