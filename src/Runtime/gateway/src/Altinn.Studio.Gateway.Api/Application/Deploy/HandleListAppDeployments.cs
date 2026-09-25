using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Deploy;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleListAppDeployments
{
    internal static async Task<IResult> ListAppDeploymentsHandler(
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
        var runtimeDeployments = await deploymentClient.ListAppDeployments(
            currentGatewayContext.ServiceOwner,
            cancellationToken
        );

        var helmReleaseMetadata = await GetHelmReleaseMetadata(
            currentGatewayContext.ServiceOwner,
            originEnvironment,
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

        var deployments = new List<AppDeployment>();

        foreach (var runtimeDeployment in runtimeDeployments)
        {
            var deployment = AppDeploymentMapping.FromRuntimeDeployment(
                currentGatewayContext.ServiceOwner,
                currentGatewayContext.Environment,
                runtimeDeployment
            );

            helmReleaseMetadata.Metadata.TryGetValue(runtimeDeployment.App, out var metadata);
            deployment = AppDeploymentMapping.WithGitOpsMetadata(deployment, metadata);
            if (includeNonGitOps != true && !deployment.IsGitOpsManaged)
            {
                continue;
            }

            deployments.Add(deployment);
        }

        return Results.Ok(deployments);
    }

    private static async Task<HelmReleaseMetadataResult> GetHelmReleaseMetadata(
        string org,
        string originEnvironment,
        HelmReleaseClient helmReleaseClient,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<HelmRelease> helmReleases;
        try
        {
            var labelSelector = HelmReleaseLabelSelector.ForOrgAndSourceEnvironment(org, originEnvironment);
            helmReleases = await helmReleaseClient.List(
                "default",
                labelSelector: labelSelector,
                cancellationToken: cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(
                ex,
                "Failed to get HelmRelease metadata for {Org}/{OriginEnvironment}. Returning runtime deployments without GitOps metadata.",
                org,
                originEnvironment
            );
            return HelmReleaseMetadataResult.Failure();
        }

        var result = new Dictionary<string, HelmReleaseMapping.DeploymentMetadata>(StringComparer.Ordinal);

        foreach (var helmRelease in helmReleases)
        {
            if (!HelmReleaseMapping.TryGetDeploymentMetadata(helmRelease, out var metadata, out var error))
            {
                logger.LogWarning(
                    "Invalid HelmRelease metadata for {HelmReleaseName}: {Error}",
                    helmRelease.GetName(),
                    error
                );
                continue;
            }

            if (!result.TryAdd(metadata.App, metadata))
            {
                logger.LogWarning(
                    "Duplicate HelmRelease metadata for {Org}/{App}. Keeping the first metadata.",
                    org,
                    metadata.App
                );
            }
        }

        return HelmReleaseMetadataResult.Success(result);
    }

    private sealed record HelmReleaseMetadataResult(
        Dictionary<string, HelmReleaseMapping.DeploymentMetadata> Metadata,
        bool Failed
    )
    {
        public static HelmReleaseMetadataResult Success(
            Dictionary<string, HelmReleaseMapping.DeploymentMetadata> metadata
        ) => new(metadata, Failed: false);

        public static HelmReleaseMetadataResult Failure() => new(Metadata: [], Failed: true);
    }
}
