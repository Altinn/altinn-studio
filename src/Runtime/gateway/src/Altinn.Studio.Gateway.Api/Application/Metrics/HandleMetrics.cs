using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Metrics;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleMetrics
{
    internal static async Task<IResult> GetErrorMetrics(
        IOptionsMonitor<GatewayContext> gatewayContext,
        IServiceProvider serviceProvider,
        IOptionsMonitor<MetricsClientSettings> metricsClientSettings,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.CurrentValue.Provider
        );
        var currentGatewayContext = gatewayContext.CurrentValue;

        var now = DateTimeOffset.UtcNow;
        var from = now.AddMinutes(-range);

        var amFailedRequests = await metricsClient.GetFailedRequests(range, cancellationToken);
        var metrics = amFailedRequests.Select(metric => new ErrorMetric
        {
            Name = metric.Name,
            AppName = metric.AppName,
            Count = metric.Count,
            LogsUrl = metricsClient.GetLogsUrl(
                currentGatewayContext.AzureSubscriptionId,
                currentGatewayContext.ServiceOwner,
                currentGatewayContext.Environment,
                [metric.AppName],
                metric.Name,
                from,
                now
            ),
        });

        return Results.Ok(metrics);
    }

    internal static async Task<IResult> GetAppMetrics(
        IServiceProvider serviceProvider,
        IOptionsMonitor<MetricsClientSettings> metricsClientSettings,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.CurrentValue.Provider
        );

        var amMetrics = await metricsClient.GetAppMetrics(app, range, cancellationToken);

        var metrics = amMetrics.Select(metric => new AppMetric
        {
            Name = metric.Name,
            DataPoints = metric.DataPoints.Select(dataPoint => new AppMetricDataPoint
            {
                DateTimeOffset = dataPoint.DateTimeOffset,
                Count = dataPoint.Count,
            }),
        });

        return Results.Ok(metrics);
    }

    internal static async Task<IResult> GetAppErrorMetrics(
        IOptionsMonitor<GatewayContext> gatewayContext,
        IServiceProvider serviceProvider,
        IOptionsMonitor<MetricsClientSettings> metricsClientSettings,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.CurrentValue.Provider
        );
        var currentGatewayContext = gatewayContext.CurrentValue;

        var now = DateTimeOffset.UtcNow;
        var from = now.AddMinutes(-range);

        var amFailedRequests = await metricsClient.GetAppFailedRequests(app, range, cancellationToken);

        var metrics = amFailedRequests.Select(failedRequest => new AppErrorMetric
        {
            Name = failedRequest.Name,
            DataPoints = failedRequest.DataPoints.Select(dataPoint => new AppMetricDataPoint
            {
                DateTimeOffset = dataPoint.DateTimeOffset,
                Count = dataPoint.Count,
            }),
            LogsUrl = metricsClient.GetLogsUrl(
                currentGatewayContext.AzureSubscriptionId,
                currentGatewayContext.ServiceOwner,
                currentGatewayContext.Environment,
                [app],
                failedRequest.Name,
                from,
                now
            ),
        });

        return Results.Ok(metrics);
    }

    internal static async Task<IResult> GetAppHealthMetrics(
        PodsClient podsClient,
        string app,
        CancellationToken cancellationToken
    )
    {
        var readyPodsCount = await podsClient.GetReadyPodsCount(app, cancellationToken);

        var metrics = new List<AppHealthMetric>
        {
            new() { Name = "ready_pods", Count = readyPodsCount },
        };

        return Results.Ok(metrics);
    }
}
