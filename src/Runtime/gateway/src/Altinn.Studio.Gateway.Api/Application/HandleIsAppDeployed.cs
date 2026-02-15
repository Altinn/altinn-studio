using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Deploy;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleIsAppDeployed
{
    internal static async Task<IResult> IsAppDeployedHandler(
        string app,
        string originEnvironment,
        GatewayContext gatewayContext,
        HelmReleaseClient helmReleaseClient,
        CancellationToken cancellationToken
    )
    {
        var helmReleaseName = HelmReleaseNameHelper.Generate(gatewayContext.ServiceOwner, app, originEnvironment);
        var helmRelease = await helmReleaseClient.GetAsync(helmReleaseName, "default", cancellationToken);
        return Results.Ok(new IsAppDeployedResponse(helmRelease is not null));
    }
}
