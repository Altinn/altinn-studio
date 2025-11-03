#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for pipelines
    /// </summary>
    [ApiController]
    // Obsolete route
    [Route("/designer/api/v1")]
    // Route that is consistent with newer version
    [Route("/designer/api/")]
    public class PipelinesController : ControllerBase
    {
        private readonly IReleaseService _releaseService;
        private readonly IDeploymentService _deploymentService;
        private readonly ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="releaseService">IReleaseService</param>
        /// <param name="deploymentService">IDeploymentService</param>
        /// <param name="logger"></param>
        public PipelinesController(
            IReleaseService releaseService,
            IDeploymentService deploymentService,
            ILogger<PipelinesController> logger)
        {
            _releaseService = releaseService;
            _deploymentService = deploymentService;
            _logger = logger;
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        [HttpPost]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        // Obsolete route
        [Route("checkreleasebuildstatus")]
        // Route that is consistent with newer version
        [Route("check-release-build-status")]
        public async Task<IActionResult> CheckReleaseStatus([FromBody] AzureDevOpsWebHookEventModel model)
        {
            _logger.LogInformation("checkreleasebuildstatus was with BuildNumber {BuildNumber} and ResourceOwner {ResourceOwner}", model?.Resource?.BuildNumber, model?.Resource?.ResourceOwner);
            await _releaseService.UpdateAsync(model?.Resource?.BuildNumber, model?.Resource?.ResourceOwner);
            return Ok();
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        [HttpPost]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        // Obsolete route
        [Route("checkdeploymentbuildstatus")]
        // Route that is consistent with newer version
        [Route("check-deployment-build-status")]
        [Obsolete]
        public async Task<IActionResult> CheckDeploymentStatus([FromBody] AzureDevOpsWebHookEventModel model)
        {
            // Updating of the status is done with the quartz job.
            // This method is obsolete and should be removed when the pipeline is updated.
            await Task.CompletedTask;
            return Ok();
        }
    }
}
