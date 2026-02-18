using Altinn.Studio.Gateway.Api.Hosting;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class Registration
{
    public static WebApplication AddPublicApis(this WebApplication app)
    {
        var publicApiV1 = app.MapGroup("/runtime/gateway/api/v1").RequirePublicPort();
        publicApiV1.MapHealthEndpoints();
        publicApiV1.MapDeployEndpoints();
        publicApiV1.MapAlertsEndpoints();
        publicApiV1.MapMetricsEndpoints();
        return app;
    }
}
