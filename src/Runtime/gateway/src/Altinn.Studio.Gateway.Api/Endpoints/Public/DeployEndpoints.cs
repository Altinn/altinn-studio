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
            .MapGet("/apps/{app}/running", HandleGetRunningAppDeployment.Handler)
            .WithName("GetRunningAppDeployment")
            .WithSummary("Get the running App deployment.")
            .WithDescription(
                "Endpoint to get the version of an app that runs in the cluster, whichever Studio environment deployed it."
            );

        deployApi
            .MapPost("/apps/{app}/restart", HandleRestartApp.Handler)
            .WithName("RestartApp")
            .WithSummary("Restart an App.")
            .WithDescription(
                "Endpoint to replace an app's running instances with new ones of the same version, without a deploy. Returns 409 while a deploy or restart is still replacing them."
            );

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
