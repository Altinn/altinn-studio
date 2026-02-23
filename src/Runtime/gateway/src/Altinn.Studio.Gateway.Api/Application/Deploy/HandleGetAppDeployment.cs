using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleGetAppDeployment
{
    internal static async Task<IResult> GetAppDeploymentHandler(
        string app,
        string originEnvironment,
        IOptionsMonitor<GatewayContext> gatewayContext,
        HelmReleaseClient helmReleaseClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        var currentGatewayContext = gatewayContext.CurrentValue;
        var helmReleaseName = HelmReleaseNameHelper.Generate(
            currentGatewayContext.ServiceOwner,
            app,
            originEnvironment
        );

        var helmRelease = await helmReleaseClient.Get(helmReleaseName, "default", cancellationToken);

        if (helmRelease is null)
            return Results.NotFound();

        if (
            !HelmReleaseMapping.TryCreateAppDeployment(
                helmRelease,
                currentGatewayContext.Environment,
                out var deployment,
                out var error
            )
        )
        {
            logger.LogError("Invalid HelmRelease state for {HelmReleaseName}: {Error}", helmReleaseName, error);

            return Results.Problem(
                title: $"Invalid HelmRelease state for {helmReleaseName}",
                detail: error,
                statusCode: StatusCodes.Status500InternalServerError
            );
        }

        return Results.Ok(deployment);
    }
}
