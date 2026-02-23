namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal sealed record HealthResponse(string Status);

internal static class HealthEndpoints
{
    public static RouteGroupBuilder MapHealthEndpoints(this RouteGroupBuilder publicApiV1)
    {
        publicApiV1
            .MapGet("/health", () => Results.Ok(new HealthResponse("healthy")))
            .RequireAuthorization("MaskinportenScope")
            .WithName("RuntimeHealth")
            .WithTags("Health");

        return publicApiV1;
    }
}
