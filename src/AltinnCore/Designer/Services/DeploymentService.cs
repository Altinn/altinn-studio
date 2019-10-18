using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums;
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
        private readonly IAzureDevOpsBuildService _azureDevOpsBuildService;
        private readonly ISourceControl _sourceControl;
        private readonly ReleaseDbRepository _releaseDbRepository;
        private readonly DeploymentDbRepository _deploymentDbRepository;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly HttpContext _httpContext;
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly string _app;
        private readonly string _org;

        /// <summary>
        /// Constructor
        /// </summary>
        public DeploymentService(
            IOptionsMonitor<AzureDevOpsSettings> azureDevOpsOptions,
            IAzureDevOpsBuildService azureDevOpsBuildService,
            IHttpContextAccessor httpContextAccessor,
            ISourceControl sourceControl,
            ReleaseDbRepository releaseDbRepository,
            DeploymentDbRepository deploymentDbRepository,
            IApplicationMetadataService applicationMetadataService)
        {
            _azureDevOpsBuildService = azureDevOpsBuildService;
            _sourceControl = sourceControl;
            _releaseDbRepository = releaseDbRepository;
            _deploymentDbRepository = deploymentDbRepository;
            _applicationMetadataService = applicationMetadataService;
            _azureDevOpsSettings = azureDevOpsOptions.CurrentValue;
            _httpContext = httpContextAccessor.HttpContext;
            _org = _httpContext.GetRouteValue("org").ToString();
            _app = _httpContext.GetRouteValue("app").ToString();
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(DeploymentModel deployment)
        {
            DeploymentEntity deploymentEntity = new DeploymentEntity();
            deploymentEntity.PopulateBaseProperties(_org, _app, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvironmentName = deployment.Environment.Name;

            // Get release from db coll with a specific app, org and commit id
            SqlQuerySpec sqlQuerySpec = new SqlQuerySpec
            {
                QueryText = $"SELECT * FROM db WHERE " +
                            $"db.app = @app AND " +
                            $"db.org = @org AND " +
                            $"db.tagName = @tagName AND " +
                            $"db.build.result = {BuildResult.Succeeded.ToEnumMemberAttributeValue()}",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@org", deploymentEntity.Org),
                    new SqlParameter("@app", deploymentEntity.App),
                    new SqlParameter("@tagName", deploymentEntity.TagName),
                }
            };
            IEnumerable<ReleaseEntity> releases = await _releaseDbRepository.GetWithSqlAsync<ReleaseEntity>(sqlQuerySpec);
            ReleaseEntity release = releases.Single();

            await _applicationMetadataService.RegisterApplicationInStorageAsync(_org, _app, release.TargetCommitish);

            QueueBuildParameters queueBuildParameters = new QueueBuildParameters
            {
                AppCommitId = release.TargetCommitish,
                AppDeployToken = "abc",
                AppOwner = deploymentEntity.Org,
                AppRepo = deploymentEntity.App,
                AppEnvironment = deploymentEntity.EnvironmentName
            };
            Build queuedBuild = await _azureDevOpsBuildService.QueueAsync(
                queueBuildParameters,
                _azureDevOpsSettings.DeployDefinitionId);

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };

            return await _deploymentDbRepository.CreateAsync(deploymentEntity);
        }

        /// <inheritdoc/>
        public async Task<DocumentResults<DeploymentEntity>> GetAsync(DocumentQueryModel query)
        {
            throw new System.NotImplementedException();
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(DeploymentEntity deployment)
        {
            throw new System.NotImplementedException();
        }
    }
}
