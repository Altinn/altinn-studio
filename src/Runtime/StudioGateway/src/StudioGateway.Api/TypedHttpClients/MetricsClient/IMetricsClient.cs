using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.MetricsClient;

public interface IMetricsClient
{
    public Task<IEnumerable<AppMetric>> GetMetricsAsync(string app, int time, IEnumerable<string> names, CancellationToken cancellationToken = default);
    public Task<IEnumerable<AppMetric>> GetFailedProcessNextRequestsAsync(string app, int time, CancellationToken cancellationToken);
}
