using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Settings;
using StudioGateway.Contracts.Deploy;

namespace StudioGateway.Api.Application;

internal static class HandleGetAppDeployment
{
    internal static async Task<IResult> GetAppDeploymentHandler(
        string app,
        string originEnvironment,
        GatewayContext gatewayContext,
        HelmReleaseClient helmReleaseClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        var helmReleaseName = HelmReleaseNameHelper.Generate(gatewayContext.ServiceOwner, app, originEnvironment);

        var helmRelease = await helmReleaseClient.GetAsync(helmReleaseName, "default", cancellationToken);
        if (helmRelease is null)
        {
            return Results.NotFound();
        }

        var labels = helmRelease.GetLabels();
        var imageTag = helmRelease.GetImageTag();

        if (imageTag is null)
        {
            logger.LogError(
                "Invalid HelmRelease state: HelmRelease {HelmReleaseName} is missing image tag.",
                helmReleaseName
            );
            return Results.Problem(
                title: "Invalid HelmRelease state",
                detail: $"HelmRelease '{helmReleaseName}' is missing image tag.",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }

        var org = labels[StudioLabels.Org];
        var _app = labels[StudioLabels.App];
        var sourceEnvironment = labels[StudioLabels.SourceEnvironment];
        var buildId = labels[StudioLabels.BuildId];

        return Results.Ok(
            new AppDeployment(org, gatewayContext.Environment, _app, sourceEnvironment, buildId, imageTag)
        );
    }
}
