using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.MetricsClient;

public interface IMetricsClient
{
    public Task<IEnumerable<Metric>> GetMetricsAsync(
        string app,
        int time,
        CancellationToken cancellationToken = default
    );
}
