using Altinn.Studio.Gateway.Api.Application;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class MetricsEndpoints
{
    public static RouteGroupBuilder MapMetricsEndpoints(this RouteGroupBuilder publicApiV1)
    {
        var metricsApi = publicApiV1.MapGroup("/metrics").RequireAuthorization("MaskinportenScope").WithTags("Metrics");

        metricsApi.MapGet("/errors", HandleMetrics.GetErrorMetrics).WithName("GetErrorMetrics");

        metricsApi.MapGet("/app", HandleMetrics.GetAppMetrics).WithName("GetAppMetrics");

        metricsApi.MapGet("/app/errors", HandleMetrics.GetAppErrorMetrics).WithName("GetAppErrorMetrics");

        metricsApi.MapGet("/app/health", HandleMetrics.GetAppHealthMetrics).WithName("GetAppHealthMetrics");

        return publicApiV1;
    }
}
