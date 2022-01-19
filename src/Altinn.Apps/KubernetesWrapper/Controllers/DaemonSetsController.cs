using KubernetesWrapper.Services.Interfaces;

using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    /// <summary>
    ///  Controller containing all actions related to kubernetes deamon set
    /// </summary>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class DaemonSetsController : ControllerBase
    {
        private readonly IKubernetesApiWrapper _apiWrapper;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DaemonSetsController"/> class
        /// </summary>
        /// <param name="apiWrapper">The kubernetes api wrapper client</param>
        /// <param name="logger">The logger</param>
        public DaemonSetsController(IKubernetesApiWrapper apiWrapper, ILogger<DaemonSetsController> logger)
        {
            _apiWrapper = apiWrapper;
            _logger = logger;
        }

        /// <summary>
        /// Get a list of daemonSets. For a more detailed spec of parameters see Kubernetes API DOC
        /// </summary>
        /// <param name="labelSelector">A selector to restrict the list of returned objects by their labels. Defaults to everything.</param>
        /// <param name="fieldSelector">A selector to restrict the list of returned objects by their fields. Defaults to everything.</param>
        /// <returns>A list of daemonSets in the cluster</returns>
        [HttpGet]
        [EnableCors]
        public async Task<ActionResult> GetDaemonSets(string labelSelector, string fieldSelector)
        {
            try
            {
                var daemonSets = await _apiWrapper.GetDeployedResources(Models.ResourceType.DaemonSet, null, null, fieldSelector, labelSelector);
                return Ok(daemonSets);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Unable to GetDaemonSets");
                return StatusCode(500);
            }
        }
    }
}
