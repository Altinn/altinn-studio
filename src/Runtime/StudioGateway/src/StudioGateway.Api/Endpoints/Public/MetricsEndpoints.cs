using StudioGateway.Api.Hosting;
using StudioGateway.Api.Services.Metrics;

namespace StudioGateway.Api.Endpoints.Public;

internal static class MetricsEndpoints
{
    public static WebApplication MapMetricsEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/runtime/gateway/api/v1/metrics",
                async (IMetricsService metricsService, int time, CancellationToken cancellationToken) =>
                {
                    var metrics = await metricsService.GetMetricsAsync(time, cancellationToken);
                    return Results.Ok(metrics);
                }
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetMetrics")
            .WithTags("Metrics");

        app.MapGet(
                "/runtime/gateway/api/v1/metrics/app",
                async (IMetricsService metricsService, string app, int time, CancellationToken cancellationToken) =>
                {
                    var appMetrics = await metricsService.GetAppMetricsAsync(app, time, cancellationToken);
                    return Results.Ok(appMetrics);
                }
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppMetrics")
            .WithTags("Metrics");

        app.MapGet(
                "/runtime/gateway/api/v1/metrics/app/health",
                async (IMetricsService metricsService, string app, CancellationToken cancellationToken) =>
                {
                    var appHealthMetrics = await metricsService.GetAppHealthMetricsAsync(app, cancellationToken);
                    return Results.Ok(appHealthMetrics);
                }
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppHealthMetrics")
            .WithTags("Metrics");

        return app;
    }
}
