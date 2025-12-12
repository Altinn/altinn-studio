using StudioGateway.Api.Application;
using StudioGateway.Api.Hosting;

namespace StudioGateway.Api.Endpoints.Public;

internal static class DeployEndpoints
{
    public static WebApplication MapDeployEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/runtime/gateway/api/v1/deploy/apps/{app}/{originEnvironment}/deployed",
                HandleIsAppDeployed.IsAppDeployedHandler
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("IsAppDeployed")
            .WithSummary("Check if App is deployed.")
            .WithDescription("Endpoint to check if app is deployed to cluster.")
            .WithTags("Deploy");

        return app;
    }
}
