using Altinn.Studio.Gateway.Api.Hosting;

namespace Altinn.Studio.Gateway.Api.Endpoints.Internal;

internal static class Registration
{
    public static WebApplication AddInternalApis(this WebApplication app)
    {
        var internalApiV1 = app.MapGroup("/api/v1").RequireInternalPort();
        internalApiV1.MapFluxWebhookEndpoint();
        return app;
    }
}
