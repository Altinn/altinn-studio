using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to application logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ApplicationLogsController"/> class
/// </remarks>
/// <param name="applicationLogsService">The service</param>
[Route("api/v1/[controller]")]
[ApiController]
public class ApplicationLogsController(IApplicationLogsService applicationLogsService) : ControllerBase
{
    /// <summary>
    /// Get the list of application logs
    /// </summary>
    /// <param name="app">app</param>
    /// <param name="take">take</param>
    /// <param name="time">time</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of application logs</returns>
    [HttpGet]
    [EnableCors]
    public async Task<ActionResult<IEnumerable<Log>>> GetLogs(string app = null, int take = 50, double time = 1, CancellationToken cancellationToken = default)
    {
        var logs = await applicationLogsService.GetLogs(app, take, time, cancellationToken);
        return Ok(logs);
    }
}
