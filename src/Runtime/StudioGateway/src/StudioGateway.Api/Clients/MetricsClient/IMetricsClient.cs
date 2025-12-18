using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

namespace StudioGateway.Api.Clients.MetricsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IMetricsClient
{
    public Task<IEnumerable<FailedRequest>> GetFailedRequestsAsync(int range, CancellationToken cancellationToken);
    public Task<IEnumerable<AppFailedRequest>> GetAppFailedRequestsAsync(
        string app,
        int range,
        CancellationToken cancellationToken
    );
    public Task<IEnumerable<AppMetric>> GetAppMetricsAsync(string app, int range, CancellationToken cancellationToken);
}
