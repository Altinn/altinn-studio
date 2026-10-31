using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Runtime;

/// <summary>
/// Where an app runs, in Designer's terms. The only Designer code that knows the runtime gateway answers for it.
/// </summary>
public sealed class AppRuntime(
    IEnvironmentsService environmentsService,
    IRuntimeGatewayClient runtimeGatewayClient,
    GeneralSettings generalSettings,
    ILogger<AppRuntime> logger
)
{
    /// <summary>
    /// Gets what runs of the app in each of the org's environments. An environment that fails is
    /// <see cref="AppRunState.Unavailable"/> rather than an error, so one unreachable cluster does not hide the others.
    /// </summary>
    public async Task<IReadOnlyList<AppRunState>> GetAll(string org, string app, CancellationToken ct)
    {
        var environments = await environmentsService.GetOrganizationEnvironments(org, ct);
        return await Task.WhenAll(environments.Select(environment => Get(org, app, environment.Name, ct)));
    }

    /// <summary>
    /// Restarts the app in the environment, so its instances are replaced with new ones of the same version.
    /// </summary>
    public async Task<AppRestart> Restart(string org, string app, string environment, CancellationToken ct)
    {
        var altinnEnvironment = AltinnEnvironment.FromName(environment);
        var deployment = await runtimeGatewayClient.GetRunningAppDeployment(org, app, altinnEnvironment, ct);
        if (deployment is null)
        {
            return new AppRestart.NotRunning();
        }

        if (!DeployedHereOrUnknown(deployment.SourceEnvironment))
        {
            return new AppRestart.DeployedElsewhere();
        }

        switch (await runtimeGatewayClient.RestartApp(org, app, altinnEnvironment, ct))
        {
            case GatewayAppRestart.Started started:
                logger.LogInformation(
                    "Restarted {App} in environment {EnvName} for org {Org}.",
                    app.WithoutLineBreaks(),
                    environment.WithoutLineBreaks(),
                    org.WithoutLineBreaks()
                );
                return new AppRestart.Started(ToRunning(environment, started.Deployment));
            case GatewayAppRestart.Updating:
                return new AppRestart.Updating();
            case GatewayAppRestart.Paused:
                return new AppRestart.Paused();
            default:
                return new AppRestart.NotRunning();
        }
    }

    private async Task<AppRunState> Get(string org, string app, string environment, CancellationToken ct)
    {
        try
        {
            var deployment = await runtimeGatewayClient.GetRunningAppDeployment(
                org,
                app,
                AltinnEnvironment.FromName(environment),
                ct
            );
            if (deployment is null)
            {
                return new AppRunState.NotRunning(environment);
            }

            return ToRunning(environment, deployment);
        }
        // A timeout is the environment's failure, so only the caller's cancellation propagates.
        catch (Exception e) when (!ct.IsCancellationRequested)
        {
            logger.LogError(
                e,
                "Could not get {App} from environment {EnvName} for org {Org}.",
                app.WithoutLineBreaks(),
                environment,
                org.WithoutLineBreaks()
            );
            return new AppRunState.Unavailable(environment);
        }
    }

    private AppRunState.Running ToRunning(string environment, RunningAppDeployment deployment)
    {
        var status = StatusOf(deployment.Status);
        return new AppRunState.Running(
            environment,
            deployment.ImageTag,
            deployment.BuildId,
            status,
            deployment.RestartedAt,
            CanRestart: status is not null && DeployedHereOrUnknown(deployment.SourceEnvironment)
        );
    }

    // Every Studio environment installs an app under the same name. Apps not deployed since the deploy pipeline began
    // recording its Studio environment could have been deployed from here, so they can be restarted.
    private bool DeployedHereOrUnknown(string? sourceEnvironment) =>
        sourceEnvironment is null
        || string.Equals(sourceEnvironment, generalSettings.OriginEnvironment, StringComparison.OrdinalIgnoreCase);

    private static AppStatus? StatusOf(string? status) =>
        status switch
        {
            "ready" => AppStatus.Ready,
            "updating" => AppStatus.Updating,
            "unavailable" => AppStatus.Unavailable,
            "failed" => AppStatus.Failed,
            _ => null,
        };
}
