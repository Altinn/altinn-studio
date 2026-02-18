using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Deploy;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleListAppDeployments
{
    internal static async Task<IResult> ListAppDeploymentsHandler(
        string originEnvironment,
        IOptionsMonitor<GatewayContext> gatewayContext,
        HelmReleaseClient helmReleaseClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        var currentGatewayContext = gatewayContext.CurrentValue;
        var labelSelector = HelmReleaseLabelSelector.ForOrgAndSourceEnvironment(
            currentGatewayContext.ServiceOwner,
            originEnvironment
        );

        var helmReleases = await helmReleaseClient.List(
            "default",
            labelSelector: labelSelector,
            cancellationToken: cancellationToken
        );

        var deployments = new List<AppDeployment>();

        foreach (var helmRelease in helmReleases)
        {
            if (
                !HelmReleaseMapping.TryCreateAppDeployment(
                    helmRelease,
                    currentGatewayContext.Environment,
                    out var deployment,
                    out var error
                )
            )
            {
                logger.LogError(
                    "Invalid HelmRelease state for {HelmReleaseName}: {Error}",
                    helmRelease.GetName(),
                    error
                );
                continue;
            }

            deployments.Add(deployment);
        }

        return Results.Ok(deployments);
    }
}
