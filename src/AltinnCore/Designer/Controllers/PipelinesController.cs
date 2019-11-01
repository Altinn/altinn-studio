using System.Threading.Tasks;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using AltinnCore.Designer.ViewModels.Request;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for pipelines
    /// </summary>
    [ApiController]
    [Route("/designer/api/v1/")]
    public class PipelinesController : ControllerBase
    {
        private readonly IAzureDevOpsBuildService _buildService;

        /// <summary>
        /// Constructor
        /// </summary>
        public PipelinesController(
            IAzureDevOpsBuildService buildService)
        {
            _buildService = buildService;
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        [HttpPost("checkreleasebuildstatus")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> CheckReleaseStatus(
            [FromBody] AzureDevOpsWebHookEventModel model,
            [FromServices] IReleaseService releaseService)
        {
            string buildId = model?.Resource?.BuildNumber;
            if (string.IsNullOrWhiteSpace(buildId))
            {
                return BadRequest();
            }

            Build build = await _buildService.Get(buildId);
            await releaseService.UpdateAsync(new ReleaseEntity
            {
                Build = new BuildEntity
                {
                    Id = build.Id.ToString(),
                    Status = build.Status,
                    Result = build.Result,
                    Started = build.StartTime,
                    Finished = build.FinishTime
                }
            });

            return Ok();
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        [HttpPost("checkdeploymentbuildstatus")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<IActionResult> CheckDeploymentStatus(
            AzureDevOpsWebHookEventModel model,
            [FromServices] IDeploymentService deploymentService)
        {
            string buildId = model.Resource.BuildNumber;
            Build build = await _buildService.Get(buildId);
            await deploymentService.UpdateAsync(new DeploymentEntity
            {
                Build = new BuildEntity
                {
                    Id = build.Id.ToString(),
                    Result = build.Result,
                    Status = build.Status,
                    Started = build.StartTime,
                    Finished = build.FinishTime
                }
            });

            return Ok();
        }
    }
}
