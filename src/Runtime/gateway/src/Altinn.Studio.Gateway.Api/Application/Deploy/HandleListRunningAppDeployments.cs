using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleListRunningAppDeployments
{
    internal static async Task<IResult> Handler(
        IOptionsMonitor<GatewayContext> gatewayContext,
        DeploymentsClient deploymentsClient,
        CancellationToken cancellationToken
    )
    {
        var running = await deploymentsClient.ListRunning(
            gatewayContext.CurrentValue.ServiceOwner,
            "default",
            cancellationToken
        );
        return Results.Ok(running);
    }
}
