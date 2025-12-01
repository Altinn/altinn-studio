using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.TypedHttpClients.MetricsClient;

namespace StudioGateway.Api.Services.Metrics;

public class MetricsService(
    IServiceProvider serviceProvider,
    IOptions<MetricsClientSettings> metricsClientSettings
) : IMetricsService
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken = default)
    {
        IMetricsClient client = serviceProvider.GetRequiredKeyedService<IMetricsClient>(_metricsClientSettings.Provider);

        IEnumerable<Metric> metrics = await client.GetMetricsAsync(app, time, cancellationToken);

        return metrics;
    }
}
