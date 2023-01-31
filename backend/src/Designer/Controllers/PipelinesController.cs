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
    [Route("/designer/api/")]
    public class PipelinesController : ControllerBase
    {
        private readonly IPipelineService _pipelineService;
        private readonly ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public PipelinesController(
            IPipelineService pipelineService,
            ILogger<PipelinesController> logger)
        {
            _pipelineService = pipelineService;
            _logger = logger;
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        [HttpPost]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        [Route("check-release-build-status")]
        public async Task<IActionResult> CheckReleaseStatus([FromBody] AzureDevOpsWebHookEventModel model)
        {
            await _pipelineService.UpdateReleaseStatus(model?.Resource?.BuildNumber, model?.Resource?.ResourceOwner);
            return Ok();
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        [HttpPost]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        [Route("check-deployment-build-status")]
        public async Task<IActionResult> CheckDeploymentStatus([FromBody] AzureDevOpsWebHookEventModel model)
        {
            await _pipelineService.UpdateDeploymentStatus(model?.Resource?.BuildNumber, model?.Resource?.ResourceOwner);
            return Ok();
        }
    }
}
