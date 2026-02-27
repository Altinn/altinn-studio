namespace Altinn.Studio.Gateway.Api.Endpoints.Local;

internal sealed record ClientIpResponse(
    string? RemoteIp,
    string? XForwardedFor,
    string? XForwardedProto,
    string? XForwardedHost
);

internal static class DebugEndpoints
{
    public static RouteGroupBuilder MapDebugEndpoints(this RouteGroupBuilder localApiV1)
    {
        localApiV1
            .MapGet(
                "/debug/clientip",
                (HttpContext ctx) =>
                {
                    var headers = ctx.Request.Headers;
                    return Results.Ok(
                        new ClientIpResponse(
                            ctx.Connection.RemoteIpAddress?.ToString(),
                            headers["X-Forwarded-For"].FirstOrDefault(),
                            headers["X-Forwarded-Proto"].FirstOrDefault(),
                            headers["X-Forwarded-Host"].FirstOrDefault()
                        )
                    );
                }
            )
            .WithName("DebugClientIp")
            .WithTags("Debug")
            .ExcludeFromDescription();

        return localApiV1;
    }
}
