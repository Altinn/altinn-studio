using KubernetesWrapper.Services.Interfaces;

using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    /// <summary>
    ///  Controller containing all actions related to kubernetes deamon set
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="DaemonSetsController"/> class
    /// </remarks>
    /// <param name="apiWrapper">The kubernetes api wrapper client</param>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class DaemonSetsController(IKubernetesApiWrapper apiWrapper) : ControllerBase
    {
        private readonly IKubernetesApiWrapper _apiWrapper = apiWrapper;

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
            var daemonSets = await _apiWrapper.GetDeployedResources(Models.ResourceType.DaemonSet, null, null, fieldSelector, labelSelector);
            return Ok(daemonSets);
        }
    }
}
