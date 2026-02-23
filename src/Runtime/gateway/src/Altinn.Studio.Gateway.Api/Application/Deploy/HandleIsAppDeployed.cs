using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Deploy;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleIsAppDeployed
{
    internal static async Task<IResult> IsAppDeployedHandler(
        string app,
        string originEnvironment,
        IOptionsMonitor<GatewayContext> gatewayContext,
        HelmReleaseClient helmReleaseClient,
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
        return Results.Ok(new IsAppDeployedResponse(helmRelease is not null));
    }
}
