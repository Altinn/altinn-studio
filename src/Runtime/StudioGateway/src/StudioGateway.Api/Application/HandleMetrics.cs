using k8s.Models;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Clients.MetricsClient;
using StudioGateway.Api.Settings;
using StudioGateway.Contracts.Metrics;

namespace StudioGateway.Api.Application;

internal static class HandleMetrics
{
    internal static async Task<IResult> GetMetricsAsync(
        GatewayContext gatewayContext,
        IServiceProvider serviceProvider,
        MetricsClientSettings metricsClientSettings,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.Provider
        );

        var azureMonitorMetrics = await metricsClient.GetMetricsAsync(range, cancellationToken);
        var metrics = azureMonitorMetrics.Select(metric =>
        {
            return new Metric
            {
                Name = metric.Name,
                OperationNames = metric.OperationNames,
                Apps = metric.Apps.Select(appMetric => new MetricApp
                {
                    AppName = appMetric.AppName,
                    Count = appMetric.Count,
                }),
            };
        });

        return Results.Ok(
            new MetricsResponse { SubscriptionId = gatewayContext.AzureSubscriptionId, Metrics = metrics }
        );
    }

    internal static async Task<IResult> GetAppMetricsAsync(
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

        return Results.Ok(metrics);
    }

    internal static async Task<IResult> GetAppHealthMetricsAsync(
        PodsClient podsClient,
        string app,
        CancellationToken cancellationToken
    )
    {
        IList<V1Pod> pods = await podsClient.GetPodsAsync(app, cancellationToken);

        var readyPodsCount = pods.Count(pod =>
            pod.Spec.Containers.All(container =>
                pod.Status.ContainerStatuses.FirstOrDefault(s => s.Name == container.Name)?.Ready == true
            )
        );

        var metrics = new List<AppHealthMetric>
        {
            new() { Name = "ready_pods", Count = Math.Round((double)readyPodsCount / pods.Count * 100) },
        };

        return Results.Ok(metrics);
    }
}
