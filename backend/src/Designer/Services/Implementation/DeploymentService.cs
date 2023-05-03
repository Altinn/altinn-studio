using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the business logic
    /// </summary>
    public class DeploymentService : IDeploymentService
    {
        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
        private readonly IDeploymentRepository _deploymentRepository;
        private readonly IReleaseRepository _releaseRepository;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly HttpContext _httpContext;
        private readonly IApplicationInformationService _applicationInformationService;
        private readonly IEnvironmentsService _environmentsService;
        private readonly IKubernetesWrapperClient _kubernetesWrapperClient;
        private readonly ILogger<DeploymentService> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public DeploymentService(
            AzureDevOpsSettings azureDevOpsOptions,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IHttpContextAccessor httpContextAccessor,
            IDeploymentRepository deploymentRepository,
            IReleaseRepository releaseRepository,
            IEnvironmentsService environmentsService,
            IKubernetesWrapperClient kubernetesWrapperClient,
            IApplicationInformationService applicationInformationService,
            ILogger<DeploymentService> logger)
        {
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _deploymentRepository = deploymentRepository;
            _releaseRepository = releaseRepository;
            _applicationInformationService = applicationInformationService;
            _environmentsService = environmentsService;
            _kubernetesWrapperClient = kubernetesWrapperClient;
            _azureDevOpsSettings = azureDevOpsOptions;
            _httpContext = httpContextAccessor.HttpContext;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(string org, string app, DeploymentModel deployment)
        {
            DeploymentEntity deploymentEntity = new();
            deploymentEntity.PopulateBaseProperties(org, app, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvName = deployment.EnvName;

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(org, app, deploymentEntity.TagName);

            await _applicationInformationService
                .UpdateApplicationInformationAsync(org, app, release.TargetCommitish, deployment.EnvName);
            Build queuedBuild = await QueueDeploymentBuild(release, deploymentEntity, deployment.EnvName);

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };

            return await _deploymentRepository.Create(deploymentEntity);
        }

        /// <inheritdoc/>
        public async Task<SearchResults<DeploymentEntity>> GetAsync(string org, string app, DocumentQueryModel query)
        {
            IEnumerable<DeploymentEntity> results = await _deploymentRepository.Get(org, app, query);
            IEnumerable<DeploymentEntity> deploymentEntities = results as DeploymentEntity[] ?? results.ToArray();

            List<EnvironmentModel> environments = await _environmentsService.GetEnvironments();
            foreach (EnvironmentModel env in environments)
            {
                try
                {
                    IList<Deployment> deploymentsInEnv =
                        await _kubernetesWrapperClient.GetDeploymentsInEnvAsync(org, env);
                    await Parallel.ForEachAsync(deploymentEntities
                        .Where(deployment => deployment.EnvName == env.Name)
                        .ToList(), (deployment, _) =>
                    {
                        deployment.DeployedInEnv = deploymentsInEnv.Contains(new Deployment
                        {
                            Version = deployment.TagName,
                            Release = $"{deployment.Org}-{deployment.App}"
                        });
                        return default;
                    });
                }
                catch (KubernetesWrapperResponseException)
                {
                    _logger.LogInformation("Make sure the requested environment, {EnvName}, exists", env.Hostname);
                }
            }

            return new SearchResults<DeploymentEntity> { Results = deploymentEntities };
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(string buildNumber, string appOwner)
        {
            DeploymentEntity deploymentEntity = await _deploymentRepository.Get(appOwner, buildNumber);

            try
            {
                BuildEntity buildEntity = await _azureDevOpsBuildClient.Get(buildNumber);
                DeploymentEntity deployment = new() { Build = buildEntity };

                deploymentEntity.Build.Status = deployment.Build.Status;
                deploymentEntity.Build.Result = deployment.Build.Result;
                deploymentEntity.Build.Started = deployment.Build.Started;
                deploymentEntity.Build.Finished = deployment.Build.Finished;

                await _deploymentRepository.Update(deploymentEntity);
            }
            catch (HttpRequestException)
            {
                _logger.LogInformation("The requested build number {buildNumber} does not exist, updating it as failed in the database", buildNumber);
                deploymentEntity.Build.Status = BuildStatus.Completed;
                deploymentEntity.Build.Result = BuildResult.Failed;
                await _deploymentRepository.Update(deploymentEntity);
            }
        }

        private async Task<Build> QueueDeploymentBuild(
            ReleaseEntity release,
            DeploymentEntity deploymentEntity,
            string envName)
        {
            QueueBuildParameters queueBuildParameters = new()
            {
                AppCommitId = release.TargetCommitish,
                AppOwner = deploymentEntity.Org,
                AppRepo = deploymentEntity.App,
                AppEnvironment = deploymentEntity.EnvName,
                Hostname = await _environmentsService.GetHostNameByEnvName(envName),
                TagName = deploymentEntity.TagName
            };

            return await _azureDevOpsBuildClient.QueueAsync(
                queueBuildParameters,
                _azureDevOpsSettings.DeployDefinitionId);
        }
    }
}
