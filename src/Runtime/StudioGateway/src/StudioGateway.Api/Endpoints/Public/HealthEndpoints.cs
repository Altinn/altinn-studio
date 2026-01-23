using Common;

namespace StudioGateway.Api.Endpoints.Public;

internal sealed record HealthResponse(string Status);

internal static class HealthEndpoints
{
    public static WebApplication MapHealthEndpoints(this WebApplication app)
    {
        app.MapGet("/runtime/gateway/api/v1/health", () => Results.Ok(new HealthResponse("healthy")))
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("RuntimeHealth")
            .WithTags("Health");

        return app;
    }
}
