using Altinn.Studio.Common;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class Registration
{
    public const string BasePath = "/runtime/gateway/api/v1";

    public static WebApplication AddPublicApis(this WebApplication app)
    {
        var publicApiV1 = app.MapGroup(BasePath).RequirePublicPort();
        publicApiV1.MapHealthEndpoints();
        publicApiV1.MapDeployEndpoints();
        publicApiV1.MapAlertsEndpoints();
        publicApiV1.MapMetricsEndpoints();
        publicApiV1.MapWorkflowsEndpoints();
        return app;
    }
}
