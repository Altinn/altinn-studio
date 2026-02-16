using Altinn.Studio.Gateway.Api.Settings;

namespace Altinn.Studio.Gateway.Api.Authentication;

internal sealed class GrafanaAuthenticationFilter(GrafanaSettings grafanaSettings) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var request = context.HttpContext.Request;

        if (!request.Headers.TryGetValue("Authorization", out var authHeader))
            return Results.Unauthorized();

        var authValue = authHeader.ToString().Trim();
        if (!authValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Results.Unauthorized();

        var token = authValue.Substring(7).Trim();
        if (token != grafanaSettings.Token)
            return Results.Unauthorized();

        return await next(context);
    }
}
