using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Designer.ModelBinding.Constants;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using AltinnCore.Designer.ViewModels.Request;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;

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
        /// <returns>Created release</returns>
        [HttpPost("checkreleasebuildstatus")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult> CheckReleaseStatus(
            AzureDevOpsWebHookEventModel model,
            [FromServices] ReleaseDbRepository releaseDbRepository)
        {
            string buildId = model.Resource.BuildNumber;
            Build build = await _buildService.Get(buildId);
            SqlQuerySpec sqlQuerySpec = new SqlQuerySpec
            {
                QueryText = "SELECT * FROM db WHERE db.build.id = @buildId",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@buildId", buildId)
                }
            };
            IEnumerable<ReleaseEntity> releases = await releaseDbRepository.GetWithSqlAsync<ReleaseEntity>(sqlQuerySpec);
            ReleaseEntity release = releases.Single();

            release.Build.Started = build.StartTime;
            release.Build.Finished = build.FinishTime;
            release.Build.Result = build.Result;
            release.Build.Status = build.Status;

            await releaseDbRepository.UpdateAsync(release);

            return Ok();
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        /// <returns>Created release</returns>
        [HttpPost("checkdeploymentbuildstatus")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult> CheckDeploymentStatus(
            AzureDevOpsWebHookEventModel model,
            [FromServices] DeploymentDbRepository deploymentDbRepository)
        {
            string buildId = model.Resource.BuildNumber;
            Build build = await _buildService.Get(buildId);
            SqlQuerySpec sqlQuerySpec = new SqlQuerySpec
            {
                QueryText = "SELECT * FROM db WHERE db.build.id = @buildId",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@buildId", buildId)
                }
            };
            IEnumerable<DeploymentEntity> deployments =
                await deploymentDbRepository.GetWithSqlAsync<DeploymentEntity>(sqlQuerySpec);
            DeploymentEntity deployment = deployments.Single();

            deployment.Build.Started = build.StartTime;
            deployment.Build.Finished = build.FinishTime;
            deployment.Build.Result = build.Result;
            deployment.Build.Status = build.Status;

            await deploymentDbRepository.UpdateAsync(deployment);

            return Ok();
        }
    }
}
