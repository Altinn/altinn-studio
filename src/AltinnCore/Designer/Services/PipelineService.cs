using System.Threading.Tasks;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;

namespace AltinnCore.Designer.Services
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
        public async Task UpdateReleaseStatus(string buildNumber)
        {
            Build build = await _azureDevOpsBuildClient.Get(buildNumber);
            await _releaseService.UpdateAsync(new ReleaseEntity
            {
                Build = ToBuildEntity(build)
            });
        }

        /// <inheritdoc />
        public async Task UpdateDeploymentStatus(string buildNumber)
        {
            Build build = await _azureDevOpsBuildClient.Get(buildNumber);
            await _deploymentService.UpdateAsync(new DeploymentEntity
            {
                Build = ToBuildEntity(build)
            });
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
