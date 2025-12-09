using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.Services.Metrics;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IMetricsService
{
    public Task<IEnumerable<Metric>> GetMetricsAsync(int time, CancellationToken cancellationToken);
    public Task<IEnumerable<AppMetric>> GetAppMetricsAsync(string app, int time, CancellationToken cancellationToken);
    public Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(string app, CancellationToken cancellationToken);
}
