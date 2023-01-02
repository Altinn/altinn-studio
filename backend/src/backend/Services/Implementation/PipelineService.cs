using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// PipelineService
    /// </summary>
    public class PipelineService : IPipelineService
    {
        private readonly IReleaseService _releaseService;
        private readonly IDeploymentService _deploymentService;
        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="releaseService">IReleaseService</param>
        /// <param name="deploymentService">IDeploymentService</param>
        /// <param name="azureDevOpsBuildClient">IAzureDevOpsBuildClient</param>
        public PipelineService(
            IReleaseService releaseService,
            IDeploymentService deploymentService,
            IAzureDevOpsBuildClient azureDevOpsBuildClient)
        {
            _releaseService = releaseService;
            _deploymentService = deploymentService;
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
        }

        /// <inheritdoc />
        public async Task UpdateReleaseStatus(string buildNumber, string appOwner)
        {
            Build build = await _azureDevOpsBuildClient.Get(buildNumber);
            await _releaseService.UpdateAsync(
                new ReleaseEntity
                {
                    Build = ToBuildEntity(build)
                },
                appOwner);
        }

        /// <inheritdoc />
        public async Task UpdateDeploymentStatus(string buildNumber, string appOwner)
        {
            Build build = await _azureDevOpsBuildClient.Get(buildNumber);
            await _deploymentService.UpdateAsync(
                new DeploymentEntity
                {
                    Build = ToBuildEntity(build)
                },
                appOwner);
        }

        private static BuildEntity ToBuildEntity(Build build)
            => new BuildEntity
            {
                Id = build.Id.ToString(),
                Status = build.Status,
                Result = build.Result,
                Started = build.StartTime,
                Finished = build.FinishTime
            };
    }
}
