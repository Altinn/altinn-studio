using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Workflows;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HandleRestartApp
{
    internal static async Task<IResult> Handler(
        string app,
        IOptionsMonitor<GatewayContext> gatewayContext,
        DeploymentsClient deploymentsClient,
        ILogger<Program> logger,
        CancellationToken cancellationToken
    )
    {
        // The app goes into a label selector, where a comma would add a requirement of the caller's choosing.
        if (!AppName.IsValid(app))
        {
            return AppName.InvalidProblem();
        }

        var restart = await deploymentsClient.Restart(
            gatewayContext.CurrentValue.ServiceOwner,
            app,
            "default",
            cancellationToken
        );

        switch (restart)
        {
            case AppRestart.Started started:
                logger.LogInformation("Restarted app {App}", app);
                return Results.Accepted(value: started.Deployment);
            case AppRestart.AlreadyUpdating:
                return Results.Problem(
                    type: GatewayProblem.AppUpdatingType,
                    title: "App is updating",
                    statusCode: StatusCodes.Status409Conflict,
                    detail: "A deploy or restart is still replacing the app's instances. Restart it once they are ready."
                );
            case AppRestart.Paused:
                return Results.Problem(
                    type: GatewayProblem.AppPausedType,
                    title: "App is paused",
                    statusCode: StatusCodes.Status409Conflict,
                    detail: "The app's Deployment is paused, so its instances would not be replaced. Resume it first."
                );
            default:
                return Results.NotFound();
        }
    }
}
