namespace Altinn.Studio.Gateway.Api.Endpoints.Local;

internal static class LocalApiExtensions
{
    public static WebApplication AddLocalApis(this WebApplication app)
    {
        if (app.Environment.IsEnvironment("local"))
        {
            app.MapDebugEndpoints();
        }

        return app;
    }
}
