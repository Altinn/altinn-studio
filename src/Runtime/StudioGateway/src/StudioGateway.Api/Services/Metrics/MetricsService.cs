using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.Settings;
using StudioGateway.Api.TypedHttpClients.KubernetesClient;
using StudioGateway.Api.TypedHttpClients.MetricsClient;

namespace StudioGateway.Api.Services.Metrics;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class MetricsService(
    IServiceProvider serviceProvider,
    IOptions<MetricsClientSettings> metricsClientSettings,
    IKubernetesClient kubernetesClient
) : IMetricsService
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(int range, CancellationToken cancellationToken)
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            _metricsClientSettings.Provider
        );

        IEnumerable<Metric> metrics = await metricsClient.GetMetricsAsync(range, cancellationToken);

        return metrics;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            _metricsClientSettings.Provider
        );

        IEnumerable<AppMetric> metrics = await metricsClient.GetAppMetricsAsync(app, range, cancellationToken);

        return metrics;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string app,
        CancellationToken cancellationToken
    )
    {
        AppHealthMetric readyPodsMetric = await kubernetesClient.GetReadyPodsMetricAsync(app, cancellationToken);
        return [readyPodsMetric];
    }
}
