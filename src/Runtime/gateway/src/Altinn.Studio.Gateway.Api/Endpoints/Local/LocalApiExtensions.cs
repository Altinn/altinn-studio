using Altinn.Studio.Gateway.Api.Hosting;

namespace Altinn.Studio.Gateway.Api.Endpoints.Local;

internal static class LocalApiExtensions
{
    public static WebApplication AddLocalApis(this WebApplication app)
    {
        if (app.Environment.IsEnvironment("local"))
        {
            var localApiV1 = app.MapGroup("/runtime/gateway/api/v1").RequirePublicPort();
            localApiV1.MapDebugEndpoints();
        }

        return app;
    }
}
