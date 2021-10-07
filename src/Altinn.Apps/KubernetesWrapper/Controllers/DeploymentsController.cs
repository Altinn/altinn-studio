using System;
using System.Threading.Tasks;

using KubernetesWrapper.Services.Interfaces;

using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace KubernetesWrapper.Controllers
{
    /// <summary>
    ///  Controller containing all actions related to kubernetes deployments
    /// </summary>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class DeploymentsController : ControllerBase
    {
        private readonly IKubernetesApiWrapper _apiWrapper;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeploymentsController"/> class
        /// </summary>
        /// <param name="apiWrapper">The kubernetes api wrapper client</param>
        /// <param name="logger">The logger</param>
        public DeploymentsController(IKubernetesApiWrapper apiWrapper, ILogger<DeploymentsController> logger)
        {
            _apiWrapper = apiWrapper;
            _logger = logger;
        }

        /// <summary>
        /// Get a list of deployments. For a more detailed spec of parameters see Kubernetes API DOC
        /// </summary>
        /// <param name="labelSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything.</param>
        /// <param name="fieldSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything.</param>
        /// <returns>A list of deployments in the cluster</returns>
        [HttpGet]
        [EnableCors]
        public async Task<ActionResult> GetDeployments(string labelSelector, string fieldSelector)
        {
            try
            {
                _logger.LogError($"ENDPOINT HIT");
                var deployments = await _apiWrapper.GetDeployedResources(Models.ResourceType.Deployment, null, null, fieldSelector, labelSelector);
                return Ok(deployments);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Unable to GetDeployments");
                return StatusCode(500);
            }
        }
    }
}
