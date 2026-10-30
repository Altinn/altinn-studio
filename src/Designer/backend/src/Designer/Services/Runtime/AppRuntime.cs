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

            return new AppRunState.Running(environment, deployment.ImageTag, DeployedBy(deployment));
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

    private StudioDeploy DeployedBy(RunningAppDeployment deployment) =>
        (deployment.SourceEnvironment, deployment.BuildId) switch
        {
            (null, _) or (_, null) => new StudioDeploy.Unknown(),
            var (source, buildId) when source == generalSettings.OriginEnvironment => new StudioDeploy.ThisStudio(
                buildId
            ),
            _ => new StudioDeploy.AnotherStudio(),
        };
}
