using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.MetricsClient;

public interface IMetricsClient
{
    public Task<IEnumerable<AppMetric>> GetMetricsAsync(IEnumerable<string>? apps, int time, CancellationToken cancellationToken = default);
}
