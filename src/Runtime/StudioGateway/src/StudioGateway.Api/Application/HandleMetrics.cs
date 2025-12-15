using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.Settings;
using StudioGateway.Api.TypedHttpClients.KubernetesClient;
using StudioGateway.Api.TypedHttpClients.MetricsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

namespace StudioGateway.Api.Application;

internal static class HandleMetrics
{
    /// <inheritdoc />
    internal static async Task NotifyAlertsUpdatedAsync(IStudioClient studioClient, CancellationToken cancellationToken)
    {
        await studioClient.NotifyAlertsUpdatedAsync(cancellationToken);
    }

    internal static async Task<IEnumerable<Metric>> GetMetricsAsync(
        IServiceProvider serviceProvider,
        MetricsClientSettings metricsClientSettings,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.Provider
        );

        IEnumerable<Metric> metrics = await metricsClient.GetMetricsAsync(range, cancellationToken);

        return metrics;
    }

    /// <inheritdoc />
    internal static async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        IServiceProvider serviceProvider,
        MetricsClientSettings metricsClientSettings,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.Provider
        );

        IEnumerable<AppMetric> metrics = await metricsClient.GetAppMetricsAsync(app, range, cancellationToken);

        return metrics;
    }

    /// <inheritdoc />
    internal static async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        IKubernetesClient kubernetesClient,
        string app,
        CancellationToken cancellationToken
    )
    {
        AppHealthMetric readyPodsMetric = await kubernetesClient.GetReadyPodsMetricAsync(app, cancellationToken);
        return [readyPodsMetric];
    }
}
