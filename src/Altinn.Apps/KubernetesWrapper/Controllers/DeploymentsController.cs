using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    /// <summary>
    ///  Controller containing all actions related to kubernetes deployments
    /// </summary>
    [Route("/[controller]")]
    [ApiController]
    public class DeploymentsController : ControllerBase
    {
        private readonly IKubernetesAPIWrapper _apiWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="DeploymentsController"/> class
        /// </summary>
        /// <param name="apiWrapper">The kubernetes api wrapper client</param>
        public DeploymentsController(IKubernetesAPIWrapper apiWrapper)
        {
            _apiWrapper = apiWrapper;
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
                var deployments = await _apiWrapper.GetDeployments(null, fieldSelector, labelSelector);
                return Ok(deployments.Items);
            }
            catch (Exception e)
            {
                return StatusCode(500, e.Message);
            }
        }
    }
}
