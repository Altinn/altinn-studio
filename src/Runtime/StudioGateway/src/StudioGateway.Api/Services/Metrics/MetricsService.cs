using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.TypedHttpClients.MetricsClient;

namespace StudioGateway.Api.Services.Metrics;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class MetricsService(
    IServiceProvider serviceProvider,
    IOptions<MetricsClientSettings> metricsClientSettings
) : IMetricsService
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken)
    {
        IMetricsClient client = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            _metricsClientSettings.Provider
        );

        IEnumerable<Metric> metrics = await client.GetMetricsAsync(app, time, cancellationToken);

        return metrics;
    }
}
