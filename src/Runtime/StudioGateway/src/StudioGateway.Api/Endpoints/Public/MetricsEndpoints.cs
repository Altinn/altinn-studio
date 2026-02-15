using Altinn.Studio.Runtime.Common;
using StudioGateway.Api.Application;

namespace StudioGateway.Api.Endpoints.Public;

internal static class MetricsEndpoints
{
    public static WebApplication MapMetricsEndpoints(this WebApplication app)
    {
        app.MapGet("/runtime/gateway/api/v1/metrics/errors", HandleMetrics.GetErrorMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetErrorMetrics")
            .WithTags("Metrics");

        app.MapGet("/runtime/gateway/api/v1/metrics/app", HandleMetrics.GetAppMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppMetrics")
            .WithTags("Metrics");

        app.MapGet("/runtime/gateway/api/v1/metrics/app/errors", HandleMetrics.GetAppErrorMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppErrorMetrics")
            .WithTags("Metrics");

        app.MapGet("/runtime/gateway/api/v1/metrics/app/errors/logs", HandleMetrics.GetAppErrorMetricsLogsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetLogs")
            .WithTags("Metrics");

        app.MapGet("/runtime/gateway/api/v1/metrics/app/health", HandleMetrics.GetAppHealthMetricsAsync)
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppHealthMetrics")
            .WithTags("Metrics");

        return app;
    }
}
