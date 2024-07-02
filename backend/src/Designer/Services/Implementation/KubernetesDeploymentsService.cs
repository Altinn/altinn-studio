using System.Collections.Generic;
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
        private readonly ILogger<DeploymentService> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public KubernetesDeploymentsService(
            IEnvironmentsService environmentsService,
            IKubernetesWrapperClient kubernetesWrapperClient,
            ILogger<DeploymentService> logger)
        {
            _environmentsService = environmentsService;
            _kubernetesWrapperClient = kubernetesWrapperClient;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<List<KubernetesDeployment>> GetAsync(string org, string app)
        {
            List<KubernetesDeployment> kubernetesDeploymentList = [];

            IEnumerable<EnvironmentModel> environments = await _environmentsService.GetOrganizationEnvironments(org);

            foreach (EnvironmentModel env in environments)
            {
                KubernetesDeployment kubernetesDeployment;

                try
                {
                    kubernetesDeployment = await _kubernetesWrapperClient.GetDeploymentAsync(org, app, env);
                }
                catch (KubernetesWrapperResponseException e)
                {
                    kubernetesDeployment = new KubernetesDeployment();
                    _logger.LogError(e, "Make sure the requested environment, {EnvName}, exists", env.Hostname);
                }

                if (kubernetesDeployment != null)
                {
                    kubernetesDeployment.EnvName = env.Name;
                    kubernetesDeploymentList.Add(kubernetesDeployment);
                }
            }

            return kubernetesDeploymentList;
        }
    }
}
