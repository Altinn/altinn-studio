using Altinn.Studio.Gateway.Api.Application;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class DeployEndpoints
{
    public static RouteGroupBuilder MapDeployEndpoints(this RouteGroupBuilder publicApiV1)
    {
        var deployApi = publicApiV1.MapGroup("/deploy").RequireAuthorization("MaskinportenScope").WithTags("Deploy");

        deployApi
            .MapGet("/origin/{originEnvironment}/apps/", HandleListAppDeployments.ListAppDeploymentsHandler)
            .WithName("ListAppDeployments")
            .WithSummary("List all App deployments.")
            .WithDescription("Endpoint to list all app deployments.");

        deployApi
            .MapGet("/apps/{app}/{originEnvironment}", HandleGetAppDeployment.GetAppDeploymentHandler)
            .WithName("GetAppDeployment")
            .WithSummary("Get App deployment.")
            .WithDescription("Endpoint to get a single app deployment.");

        deployApi
            .MapGet("/apps/{app}/{originEnvironment}/deployed", HandleIsAppDeployed.IsAppDeployedHandler)
            .WithName("IsAppDeployed")
            .WithSummary("Check if App is deployed.")
            .WithDescription("Endpoint to check if app is deployed to cluster.");

        deployApi
            .MapPost("/apps/{app}/{originEnvironment}/reconcile", HandleTriggerReconcile.Handler)
            .WithName("TriggerReconcile")
            .WithSummary("Trigger Flux reconciliation.")
            .WithDescription("Triggers Flux to reconcile app resources by patching OCIRepository annotation.");

        return publicApiV1;
    }
}
