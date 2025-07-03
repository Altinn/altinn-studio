using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    /// <summary>
    ///  Controller containing all actions related to failed requests
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="FailedRequestsController"/> class
    /// </remarks>
    /// <param name="logger">The logger</param>
    /// <param name="failedRequestsService">The service</param>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class FailedRequestsController(ILogger<FailedRequestsController> logger, IFailedRequestsService failedRequestsService) : ControllerBase
    {
        /// <summary>
        /// Get the list of failed requests
        /// </summary>
        /// <param name="app">app</param>
        /// <param name="take">take</param>
        /// <param name="time">time</param>
        /// <returns>The list of failed requests</returns>
        [HttpGet]
        [EnableCors]
        public async Task<ActionResult> GetRequests(string app = null, double take = 50, double time = 24)
        {
            try
            {
                var requests = await failedRequestsService.GetRequests(app, take, time);
                return Ok(requests);
            }
            catch (Exception e)
            {
                logger.LogError(e, "Unable to get failed requests");
                return StatusCode(500);
            }
        }
    }
}
