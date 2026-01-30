using Altinn.Studio.Runtime.Common;

namespace StudioGateway.Api.Endpoints.Local;

internal sealed record ClientIpResponse(
    string? RemoteIp,
    string? XForwardedFor,
    string? XForwardedProto,
    string? XForwardedHost
);

internal static class DebugEndpoints
{
    public static WebApplication MapDebugEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/runtime/gateway/api/v1/debug/clientip",
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
            .RequirePublicPort()
            .WithName("DebugClientIp")
            .WithTags("Debug")
            .ExcludeFromDescription();

        return app;
    }
}
