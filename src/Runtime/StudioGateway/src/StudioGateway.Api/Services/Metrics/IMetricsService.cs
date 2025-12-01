using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.Services.Metrics;

public interface IMetricsService
{
    public Task<IEnumerable<Metric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken = default);
}
