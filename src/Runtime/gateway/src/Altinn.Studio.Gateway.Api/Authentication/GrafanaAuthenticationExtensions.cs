namespace Altinn.Studio.Gateway.Api.Authentication;

internal static class GrafanaAuthenticationExtensions
{
    public static RouteHandlerBuilder RequireGrafanaAuthentication(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<GrafanaAuthenticationFilter>();
    }
}
