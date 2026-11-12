using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleGetRunningAppDeployment
{
    internal static async Task<IResult> Handler(
        string app,
        IOptionsMonitor<GatewayContext> gatewayContext,
        DeploymentsClient deploymentsClient,
        CancellationToken cancellationToken
    )
    {
        // The app goes into a label selector, where a comma would add a requirement of the caller's choosing.
        if (!AppName.IsValid(app))
        {
            return AppName.InvalidProblem();
        }

        var deployment = await deploymentsClient.GetRunning(
            gatewayContext.CurrentValue.ServiceOwner,
            app,
            "default",
            cancellationToken
        );
        // Most apps run in only some environments, and Designer asks each of them. A 404 would count as a failed
        // request in Designer's telemetry.
        return deployment is null ? Results.NoContent() : Results.Ok(deployment);
    }
}
