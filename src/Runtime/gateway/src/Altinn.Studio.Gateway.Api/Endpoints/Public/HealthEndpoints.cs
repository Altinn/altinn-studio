using Altinn.Studio.Gateway.Api.Health;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class HealthEndpoints
{
    private const string Path = "/health";

    /// <summary>
    /// Maps the runtime cluster's health, which the platform team's uptime monitoring probes for every service owner.
    /// It answers without authentication, from the latest background run of the runtime checks.
    /// </summary>
    public static RouteGroupBuilder MapHealthEndpoints(this RouteGroupBuilder publicApiV1)
    {
        publicApiV1
            .MapGet(
                Path,
                (HttpContext context, RuntimeHealthReport health) =>
                    HealthReportWriter.WriteAsync(context, health.Current)
            )
            .AllowAnonymous()
            .WithName("RuntimeHealth")
            .WithTags("Health")
            .DisableHttpMetrics();

        return publicApiV1;
    }

    /// <summary>
    /// Whether a request is the public API's health check. It isn't traffic, so it stays out of traces, as the
    /// kubelet's probes under <c>/health</c> do.
    /// </summary>
    public static bool IsHealthCheck(HttpRequest request) =>
        request.Path.StartsWithSegments(Registration.BasePath + Path, StringComparison.OrdinalIgnoreCase);
}
