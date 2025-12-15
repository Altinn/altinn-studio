using StudioGateway.Api.Application;
using StudioGateway.Api.Hosting;

namespace StudioGateway.Api.Endpoints.Public;

internal static class MetricsEndpoints
{
    public static WebApplication MapMetricsEndpoints(this WebApplication app)
    {
        app.MapGet("/runtime/gateway/api/v1/metrics", HandleMetrics.GetMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetMetrics")
            .WithTags("Metrics");

        app.MapGet("/runtime/gateway/api/v1/metrics/app", HandleMetrics.GetAppMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppMetrics")
            .WithTags("Metrics");

        app.MapGet("/runtime/gateway/api/v1/metrics/app/health", HandleMetrics.GetAppHealthMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppHealthMetrics")
            .WithTags("Metrics");

        return app;
    }
}
