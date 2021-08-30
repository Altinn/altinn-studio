using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

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
        private readonly string _app;
        private readonly string _org;

        /// <summary>
        /// Constructor
        /// </summary>
        public DeploymentService(
            IOptionsMonitor<AzureDevOpsSettings> azureDevOpsOptions,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IHttpContextAccessor httpContextAccessor,
            IDeploymentRepository deploymentRepository,
            IReleaseRepository releaseRepository,
            IApplicationInformationService applicationInformationService)
        {
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _deploymentRepository = deploymentRepository;
            _releaseRepository = releaseRepository;
            _applicationInformationService = applicationInformationService;
            _azureDevOpsSettings = azureDevOpsOptions.CurrentValue;
            _httpContext = httpContextAccessor.HttpContext;
            _org = _httpContext.GetRouteValue("org")?.ToString();
            _app = _httpContext.GetRouteValue("app")?.ToString();
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(DeploymentModel deployment)
        {
            DeploymentEntity deploymentEntity = new DeploymentEntity();
            deploymentEntity.PopulateBaseProperties(_org, _app, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvironmentName = deployment.Environment.Name;

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(deploymentEntity.Org, deploymentEntity.App, deploymentEntity.TagName);

            await _applicationInformationService
                .UpdateApplicationInformationAsync(_org, _app, release.TargetCommitish, deployment.Environment);
            Build queuedBuild = await QueueDeploymentBuild(release, deploymentEntity, deployment.Environment.Hostname);

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };

            deploymentEntity.Id = Guid.NewGuid().ToString();

            return await _deploymentRepository.Create(deploymentEntity);
        }

        /// <inheritdoc/>
        public async Task<SearchResults<DeploymentEntity>> GetAsync(DocumentQueryModel query)
        {
            query.App = _app;
            query.Org = _org;
            IEnumerable<DeploymentEntity> results = await _deploymentRepository.Get(query);
            return new SearchResults<DeploymentEntity>
            {
                Results = results
            };
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(DeploymentEntity deployment, string appOwner)
        {
            DeploymentEntity deploymentEntity = await _deploymentRepository.Get(appOwner, deployment.Build.Id);
            deploymentEntity.Build.Status = deployment.Build.Status;
            deploymentEntity.Build.Result = deployment.Build.Result;
            deploymentEntity.Build.Started = deployment.Build.Started;
            deploymentEntity.Build.Finished = deployment.Build.Finished;

            await _deploymentRepository.Update(deploymentEntity);
        }

        private async Task<Build> QueueDeploymentBuild(
            ReleaseEntity release,
            DeploymentEntity deploymentEntity,
            string environmentHostname)
        {
            QueueBuildParameters queueBuildParameters = new QueueBuildParameters
            {
                AppCommitId = release.TargetCommitish,
                AppOwner = deploymentEntity.Org,
                AppRepo = deploymentEntity.App,
                AppEnvironment = deploymentEntity.EnvironmentName,
                Hostname = environmentHostname,
                TagName = deploymentEntity.TagName
            };

            return await _azureDevOpsBuildClient.QueueAsync(
                queueBuildParameters,
                _azureDevOpsSettings.DeployDefinitionId);
        }
    }
}
