using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Workflows;
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
            return Results.Problem(
                type: GatewayProblem.InvalidAppNameType,
                title: "Invalid app name",
                statusCode: StatusCodes.Status400BadRequest,
                detail: "The app route parameter must start with a letter and contain only lowercase letters, digits, and hyphens."
            );
        }

        var deployment = await deploymentsClient.GetRunning(
            gatewayContext.CurrentValue.ServiceOwner,
            app,
            "default",
            cancellationToken
        );
        return deployment is null ? Results.NotFound() : Results.Ok(deployment);
    }
}
