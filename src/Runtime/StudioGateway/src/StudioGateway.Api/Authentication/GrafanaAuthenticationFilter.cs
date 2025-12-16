using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Authentication;

internal sealed class GrafanaAuthenticationFilter(GrafanaSettings grafanaSettings) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var request = context.HttpContext.Request;

        if (!request.Headers.TryGetValue("Authorization", out var authHeader))
            return Results.Unauthorized();

        var token = authHeader.ToString().Replace("Bearer ", "").Trim();

        if (token != grafanaSettings.Token)
            return Results.Unauthorized();

        return await next(context);
    }
}
