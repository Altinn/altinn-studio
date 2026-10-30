namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal sealed record HealthResponse(string Status);

internal static class HealthEndpoints
{
    private const string Path = "/health";

    public static RouteGroupBuilder MapHealthEndpoints(this RouteGroupBuilder publicApiV1)
    {
        publicApiV1
            .MapGet(Path, () => Results.Ok(new HealthResponse("healthy")))
            .RequireAuthorization("MaskinportenScope")
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
