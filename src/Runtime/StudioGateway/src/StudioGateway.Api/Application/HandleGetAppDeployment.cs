using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Settings;

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
        var helmReleaseName = HelmReleaseNameHelper.Generate(
            gatewayContext.ServiceOwner,
            app,
            originEnvironment
        );

        var helmRelease = await helmReleaseClient.GetAsync(
            helmReleaseName,
            "default",
            cancellationToken
        );

        if (helmRelease is null)
            return Results.NotFound();

        if (
            !HelmReleaseMapping.TryCreateAppDeployment(
                helmRelease,
                gatewayContext.Environment,
                out var deployment,
                out var error
            )
        )
        {
            logger.LogError(
                "Invalid HelmRelease state for {HelmReleaseName}: {Error}",
                helmReleaseName,
                error
            );

            return Results.Problem(
                title: $"Invalid HelmRelease state for {helmReleaseName}",
                detail: error,
                statusCode: StatusCodes.Status500InternalServerError
            );
        }

        return Results.Ok(deployment);
    }
}
