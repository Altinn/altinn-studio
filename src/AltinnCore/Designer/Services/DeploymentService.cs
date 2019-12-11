using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.Designer.Services.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// Implementation of the business logic
    /// </summary>
    public class DeploymentService : IDeploymentService
    {
        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
        private readonly ReleaseRepository _releaseRepository;
        private readonly DeploymentRepository _deploymentRepository;
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
            ReleaseRepository releaseRepository,
            DeploymentRepository deploymentRepository,
            IApplicationInformationService applicationInformationService)
        {
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _releaseRepository = releaseRepository;
            _deploymentRepository = deploymentRepository;
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

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(
                deploymentEntity.Org,
                deploymentEntity.App,
                deploymentEntity.TagName);

            await _applicationInformationService
                .UpdateApplicationInformationAsync(_org, _app, release.TargetCommitish, deployment.Environment);
            Build queuedBuild = await QueueDeploymentBuild(release, deploymentEntity, deployment.Environment.Hostname);

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };

            return await _deploymentRepository.CreateAsync(deploymentEntity);
        }

        /// <inheritdoc/>
        public async Task<SearchResults<DeploymentEntity>> GetAsync(DocumentQueryModel query)
        {
            query.App = _app;
            query.Org = _org;
            IEnumerable<DeploymentEntity> results = await _deploymentRepository.GetAsync<DeploymentEntity>(query);
            return new SearchResults<DeploymentEntity>
            {
                Results = results
            };
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(DeploymentEntity deployment)
        {
            SqlQuerySpec sqlQuerySpec = new SqlQuerySpec
            {
                QueryText = "SELECT * FROM db WHERE db.build.id = @buildId",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@buildId", deployment.Build.Id),
                }
            };
            IEnumerable<DeploymentEntity> deploymentDocuments = await _deploymentRepository.GetWithSqlAsync<DeploymentEntity>(sqlQuerySpec);
            DeploymentEntity deploymentEntity = deploymentDocuments.Single();

            deploymentEntity.Build.Status = deployment.Build.Status;
            deploymentEntity.Build.Result = deployment.Build.Result;
            deploymentEntity.Build.Started = deployment.Build.Started;
            deploymentEntity.Build.Finished = deployment.Build.Finished;

            await _deploymentRepository.UpdateAsync(deploymentEntity);
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
