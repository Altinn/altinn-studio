using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.Services.Metrics;

public interface IMetricsService
{
    public Task<IEnumerable<AppMetric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken = default);
    public Task<IEnumerable<AppMetric>> GetFailedProcessNextRequestsAsync(string app, int time, CancellationToken cancellationToken = default);
}
