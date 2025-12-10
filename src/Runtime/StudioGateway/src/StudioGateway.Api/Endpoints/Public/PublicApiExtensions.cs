namespace StudioGateway.Api.Endpoints.Public;

internal static class PublicApiExtensions
{
    public static WebApplication AddPublicApis(this WebApplication app)
    {
        app.MapHealthEndpoints();
        app.MapAlertsEndpoints();
        app.MapMetricsEndpoints();
        return app;
    }
}
