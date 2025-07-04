using KubernetesWrapper.Models;
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
    /// <param name="failedRequestsService">The service</param>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class FailedRequestsController(IFailedRequestsService failedRequestsService) : ControllerBase
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
        public async Task<ActionResult<IEnumerable<Request>>> GetRequests(string app = null, double take = 50, double time = 24)
        {
            var requests = await failedRequestsService.GetRequests(app, take, time);
            return Ok(requests);
        }
    }
}
