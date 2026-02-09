namespace Altinn.Studio.Gateway.Api.Endpoints.Internal;

internal static class InternalApiExtensions
{
    public static WebApplication AddInternalApis(this WebApplication app)
    {
        app.MapFluxWebhookEndpoint();
        return app;
    }
}
