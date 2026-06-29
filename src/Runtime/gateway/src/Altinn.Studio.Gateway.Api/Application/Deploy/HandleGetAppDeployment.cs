using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleGetAppDeployment
{
    internal static async Task<IResult> GetAppDeploymentHandler(
        string app,
        string originEnvironment,
        bool? includeNonGitOps,
        IOptionsMonitor<GatewayContext> gatewayContext,
        HelmReleaseClient helmReleaseClient,
        DeploymentClient deploymentClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        var currentGatewayContext = gatewayContext.CurrentValue;
        var runtimeDeployment = await deploymentClient.GetAppDeployment(
            currentGatewayContext.ServiceOwner,
            app,
            cancellationToken
        );
        if (runtimeDeployment is null)
        {
            return Results.NotFound();
        }

        var deployment = AppDeploymentMapping.FromRuntimeDeployment(
            currentGatewayContext.ServiceOwner,
            currentGatewayContext.Environment,
            runtimeDeployment
        );

        var helmReleaseName = HelmReleaseNameHelper.Generate(
            currentGatewayContext.ServiceOwner,
            app,
            originEnvironment
        );
        var helmReleaseMetadata = await GetHelmReleaseMetadata(
            helmReleaseName,
            helmReleaseClient,
            logger,
            cancellationToken
        );
        deployment = AppDeploymentMapping.WithGitOpsMetadata(deployment, helmReleaseMetadata);

        if (includeNonGitOps != true && !deployment.IsGitOpsManaged)
        {
            return Results.NotFound();
        }

        return Results.Ok(deployment);
    }

    private static async Task<HelmReleaseMapping.DeploymentMetadata?> GetHelmReleaseMetadata(
        string helmReleaseName,
        HelmReleaseClient helmReleaseClient,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        HelmRelease? helmRelease;
        try
        {
            helmRelease = await helmReleaseClient.Get(helmReleaseName, "default", cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(
                ex,
                "Failed to get HelmRelease metadata for {HelmReleaseName}. Returning runtime deployment without GitOps metadata.",
                helmReleaseName
            );
            return null;
        }

        if (helmRelease is null)
        {
            return null;
        }

        if (!HelmReleaseMapping.TryGetDeploymentMetadata(helmRelease, out var metadata, out var error))
        {
            logger.LogWarning("Invalid HelmRelease metadata for {HelmReleaseName}: {Error}", helmReleaseName, error);
            return null;
        }

        return metadata;
    }
}
