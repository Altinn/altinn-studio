using System.Collections.Generic;
using System.Linq;
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
    public class KubernetesWrapperService : IKubernetesWrapperService
    {
        private readonly IEnvironmentsService _environmentsService;
        private readonly IKubernetesWrapperClient _kubernetesWrapperClient;
        private readonly ILogger<DeploymentService> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public KubernetesWrapperService(
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
            List<string> environmentNames = environments.Select(environment => environment.Name).ToList();

            foreach (EnvironmentModel env in environments)
            {
                try
                {
                    KubernetesDeployment kubernetesDeployment = await _kubernetesWrapperClient.GetDeploymentAsync(org, app, env);
                    kubernetesDeploymentList.Add(kubernetesDeployment);
                }
                catch (KubernetesWrapperResponseException e)
                {
                    _logger.LogError(e, "Make sure the requested environment, {EnvName}, exists", env.Hostname);
                }
            }

            return kubernetesDeploymentList;
        }
    }
}
