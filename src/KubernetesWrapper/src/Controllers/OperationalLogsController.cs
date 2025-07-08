using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to operational logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="OperationalLogsController"/> class
/// </remarks>
/// <param name="operationalLogsService">The service</param>
[Route("api/v1/[controller]")]
[ApiController]
public class OperationalLogsController(IOperationalLogsService operationalLogsService) : ControllerBase
{
    /// <summary>
    /// Get the list of operational logs
    /// </summary>
    /// <param name="queryParameters">queryParameters</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of operational logs</returns>
    [HttpGet]
    [EnableCors]
    public async Task<ActionResult<IEnumerable<Log>>> GetLogs([FromQuery] QueryParameters queryParameters, CancellationToken cancellationToken = default)
    {
        var logs = await operationalLogsService.GetLogs(queryParameters.App, queryParameters.Take, queryParameters.Time, cancellationToken);
        return Ok(logs);
    }
}
