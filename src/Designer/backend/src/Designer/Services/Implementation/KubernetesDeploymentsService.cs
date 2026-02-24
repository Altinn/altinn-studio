using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the business logic
    /// </summary>
    public class KubernetesDeploymentsService : IKubernetesDeploymentsService
    {
        private readonly IEnvironmentsService _environmentsService;
        private readonly IRuntimeGatewayClient _runtimeGatewayClient;

        /// <summary>
        /// Constructor
        /// </summary>
        public KubernetesDeploymentsService(
            IEnvironmentsService environmentsService,
            IRuntimeGatewayClient runtimeGatewayClient
        )
        {
            _environmentsService = environmentsService;
            _runtimeGatewayClient = runtimeGatewayClient;
        }

        /// <inheritdoc/>
        public async Task<List<KubernetesDeployment>> GetAsync(string org, string app, CancellationToken ct)
        {
            using var activity = ServiceTelemetry.Source.StartActivity(
                $"{nameof(KubernetesDeploymentsService)}.{nameof(GetAsync)}",
                ActivityKind.Internal
            );
            activity?.SetTag("org", org);
            activity?.SetTag("app", app);

            EnvironmentModel[] environments = (
                await _environmentsService.GetOrganizationEnvironments(org, ct)
            ).ToArray();
            activity?.SetTag("environment.count", environments.Length);

            var getDeploymentTasks = environments.Select(async env =>
            {
                using var envActivity = ServiceTelemetry.Source.StartActivity(
                    $"{nameof(KubernetesDeploymentsService)}.{nameof(GetAsync)}.Environment",
                    ActivityKind.Internal
                );
                envActivity?.SetTag("environment", env.Name);

                try
                {
                    var appDeployment = await _runtimeGatewayClient.GetAppDeployment(
                        org,
                        app,
                        AltinnEnvironment.FromName(env.Name),
                        ct
                    );
                    if (appDeployment is null)
                    {
                        return null;
                    }

                    return new KubernetesDeployment
                    {
                        EnvName = env.Name,
                        Version = appDeployment.ImageTag,
                        Release = $"{org}-{app}",
                    };
                }
                catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    envActivity?.SetStatus(ActivityStatusCode.Error);
                    envActivity?.AddException(e);
                    return null;
                }
            });

            KubernetesDeployment?[] kubernetesDeployments = await Task.WhenAll(getDeploymentTasks);
            activity?.SetTag("deployment.count", kubernetesDeployments.Count(deployment => deployment is not null));
            return kubernetesDeployments.OfType<KubernetesDeployment>().ToList();
        }
    }
}
