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
        if (helmReleaseMetadata.Failed && includeNonGitOps != true)
        {
            return Results.Problem(
                title: "Failed to get GitOps deployment metadata.",
                statusCode: StatusCodes.Status503ServiceUnavailable
            );
        }

        deployment = AppDeploymentMapping.WithGitOpsMetadata(deployment, helmReleaseMetadata.Metadata);

        if (includeNonGitOps != true && !deployment.IsGitOpsManaged)
        {
            return Results.NotFound();
        }

        return Results.Ok(deployment);
    }

    private static async Task<HelmReleaseMetadataResult> GetHelmReleaseMetadata(
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
            return HelmReleaseMetadataResult.Failure();
        }

        if (helmRelease is null)
        {
            return HelmReleaseMetadataResult.Success(null);
        }

        if (!HelmReleaseMapping.TryGetDeploymentMetadata(helmRelease, out var metadata, out var error))
        {
            logger.LogWarning("Invalid HelmRelease metadata for {HelmReleaseName}: {Error}", helmReleaseName, error);
            return HelmReleaseMetadataResult.Success(null);
        }

        return HelmReleaseMetadataResult.Success(metadata);
    }

    private sealed record HelmReleaseMetadataResult(HelmReleaseMapping.DeploymentMetadata? Metadata, bool Failed)
    {
        public static HelmReleaseMetadataResult Success(HelmReleaseMapping.DeploymentMetadata? metadata) =>
            new(metadata, Failed: false);

        public static HelmReleaseMetadataResult Failure() => new(Metadata: null, Failed: true);
    }
}
