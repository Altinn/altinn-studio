using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Implementation of the business logic
/// </summary>
public class KubernetesDeploymentsService : IKubernetesDeploymentsService
{
    private readonly IEnvironmentsService _environmentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly GeneralSettings _generalSettings;
    private readonly ILogger<KubernetesDeploymentsService> _logger;

    /// <summary>
    /// Constructor
    /// </summary>
    public KubernetesDeploymentsService(
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        GeneralSettings generalSettings,
        ILogger<KubernetesDeploymentsService> logger
    )
    {
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _generalSettings = generalSettings;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<KubernetesDeployment>> GetAsync(string org, string app, CancellationToken ct)
    {
        IEnumerable<EnvironmentModel> environments = await _environmentsService.GetOrganizationEnvironments(org, ct);

        var getDeploymentTasks = environments.Select(async env =>
        {
            try
            {
                var deployment = await _runtimeGatewayClient.GetRunningAppDeployment(
                    org,
                    app,
                    AltinnEnvironment.FromName(env.Name),
                    ct
                );

                if (deployment is null)
                {
                    return null;
                }

                return new KubernetesDeployment
                {
                    EnvName = env.Name,
                    Release = deployment.Release,
                    Version = deployment.ImageTag,
                    // Several Studio environments share a runtime cluster. Only a deploy from this one is in its history.
                    BuildId =
                        deployment.SourceEnvironment == _generalSettings.OriginEnvironment ? deployment.BuildId : null,
                };
            }
            // One unreachable cluster should not hide what runs in the others, and a timeout is no reason to fail
            // the whole request either. Only the caller's cancellation is.
            catch (Exception e) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(e, "Could not reach environment {EnvName} for org {Org}.", env.Name, org);
                return null;
            }
        });

        KubernetesDeployment?[] kubernetesDeployments = await Task.WhenAll(getDeploymentTasks);
        return kubernetesDeployments.OfType<KubernetesDeployment>().ToList();
    }
}
