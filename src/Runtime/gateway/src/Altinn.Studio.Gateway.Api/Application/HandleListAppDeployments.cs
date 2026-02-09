using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Deploy;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleListAppDeployments
{
    internal static async Task<IResult> ListAppDeploymentsHandler(
        string originEnvironment,
        GatewayContext gatewayContext,
        HelmReleaseClient helmReleaseClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        var labelSelector = HelmReleaseLabelSelector.ForOrgAndSourceEnvironment(
            gatewayContext.ServiceOwner,
            originEnvironment
        );

        var helmReleases = await helmReleaseClient.ListAsync(
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
                    gatewayContext.Environment,
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
