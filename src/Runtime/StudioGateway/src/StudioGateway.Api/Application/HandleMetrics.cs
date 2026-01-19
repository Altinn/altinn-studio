using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Clients.MetricsClient;
using StudioGateway.Api.Settings;
using StudioGateway.Contracts.Metrics;

namespace StudioGateway.Api.Application;

internal static class HandleMetrics
{
    internal static async Task<IResult> GetErrorMetricsAsync(
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

        var amFailedRequests = await metricsClient.GetFailedRequestsAsync(range, cancellationToken);
        var metrics = amFailedRequests.Select(metric => new ErrorMetric
        {
            Name = metric.Name,
            AppName = metric.AppName,
            Count = metric.Count,
        });

        return Results.Ok(metrics);
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

        var amMetrics = await metricsClient.GetAppMetricsAsync(app, range, cancellationToken);

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

    internal static async Task<IResult> GetAppErrorMetricsAsync(
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

        var amFailedRequests = await metricsClient.GetAppFailedRequestsAsync(app, range, cancellationToken);

        var metrics = amFailedRequests.Select(failedRequest => new AppErrorMetric
        {
            Name = failedRequest.Name,
            DataPoints = failedRequest.DataPoints.Select(dataPoint => new AppMetricDataPoint
            {
                DateTimeOffset = dataPoint.DateTimeOffset,
                Count = dataPoint.Count,
            }),
        });

        return Results.Ok(metrics);
    }

    internal static IResult GetAppErrorMetricsLogsAsync(
        GatewayContext gatewayContext,
        IServiceProvider serviceProvider,
        MetricsClientSettings metricsClientSettings,
        string app,
        string metric,
        int range
    )
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            metricsClientSettings.Provider
        );

        Uri? azureUrl = metricsClient.GetLogsUrl(
            gatewayContext.AzureSubscriptionId,
            gatewayContext.ServiceOwner,
            gatewayContext.Environment,
            app,
            metric,
            range
        );

        return Results.Ok(new AzureUrl(azureUrl));
    }

    internal static async Task<IResult> GetAppHealthMetricsAsync(
        PodsClient podsClient,
        string app,
        CancellationToken cancellationToken
    )
    {
        var readyPodsCount = await podsClient.GetReadyPodsCountAsync(app, cancellationToken);

        var metrics = new List<AppHealthMetric>
        {
            new() { Name = "ready_pods", Count = readyPodsCount },
        };

        return Results.Ok(metrics);
    }
}
