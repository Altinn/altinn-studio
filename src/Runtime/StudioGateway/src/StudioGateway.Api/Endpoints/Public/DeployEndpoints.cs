using Altinn.Studio.Runtime.Common;
using StudioGateway.Api.Application;

namespace StudioGateway.Api.Endpoints.Public;

internal static class DeployEndpoints
{
    public static WebApplication MapDeployEndpoints(this WebApplication app)
    {
        app.MapGet(
                "/runtime/gateway/api/v1/deploy/origin/{originEnvironment}/apps/",
                HandleListAppDeployments.ListAppDeploymentsHandler
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("ListAppDeployments")
            .WithSummary("List all App deployments.")
            .WithDescription("Endpoint to list all app deployments.")
            .WithTags("Deploy");

        app.MapGet(
                "/runtime/gateway/api/v1/deploy/apps/{app}/{originEnvironment}",
                HandleGetAppDeployment.GetAppDeploymentHandler
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("GetAppDeployment")
            .WithSummary("Get App deployment.")
            .WithDescription("Endpoint to get a single app deployment.")
            .WithTags("Deploy");

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

        app.MapPost(
                "/runtime/gateway/api/v1/deploy/apps/{app}/{originEnvironment}/reconcile",
                HandleTriggerReconcile.Handler
            )
            .RequirePublicPort()
            .RequireAuthorization("MaskinportenScope")
            .WithName("TriggerReconcile")
            .WithSummary("Trigger Flux reconciliation.")
            .WithDescription("Triggers Flux to reconcile app resources by patching OCIRepository annotation.")
            .WithTags("Deploy");

        return app;
    }
}
