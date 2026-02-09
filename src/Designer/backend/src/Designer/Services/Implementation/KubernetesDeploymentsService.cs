using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the business logic
    /// </summary>
    public class KubernetesDeploymentsService : IKubernetesDeploymentsService
    {
        private readonly IEnvironmentsService _environmentsService;
        private readonly IKubernetesWrapperClient _kubernetesWrapperClient;
        private readonly ILogger<KubernetesDeploymentsService> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public KubernetesDeploymentsService(
            IEnvironmentsService environmentsService,
            IKubernetesWrapperClient kubernetesWrapperClient,
            ILogger<KubernetesDeploymentsService> logger
        )
        {
            _environmentsService = environmentsService;
            _kubernetesWrapperClient = kubernetesWrapperClient;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<List<KubernetesDeployment>> GetAsync(
            string org,
            string app,
            CancellationToken ct
        )
        {
            IEnumerable<EnvironmentModel> environments =
                await _environmentsService.GetOrganizationEnvironments(org);

            var getDeploymentTasks = environments.Select(async env =>
            {
                try
                {
                    var deployment = await _kubernetesWrapperClient.GetDeploymentAsync(
                        org,
                        app,
                        env,
                        ct
                    );

                    if (deployment is null)
                    {
                        return null;
                    }

                    deployment.EnvName = env.Name;
                    return deployment;
                }
                catch (KubernetesWrapperResponseException e)
                {
                    _logger.LogError(e, $"Could not reach environment {env.Name} for org {org}.");
                    return null;
                }
            });

            KubernetesDeployment?[] kubernetesDeployments = await Task.WhenAll(getDeploymentTasks);
            return kubernetesDeployments.OfType<KubernetesDeployment>().ToList();
        }
    }
}
