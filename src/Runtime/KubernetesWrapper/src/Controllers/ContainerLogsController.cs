using KubernetesWrapper.Models;
using KubernetesWrapper.Models.Dto;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to container logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ContainerLogsController"/> class
/// </remarks>
/// <param name="containerLogsService">The service</param>
[Route("api/v1/[controller]")]
[ApiController]
public class ContainerLogsController(IContainerLogsService containerLogsService) : ControllerBase
{
    /// <summary>
    /// Get all container logs
    /// </summary>
    /// <param name="logFiltersDto">The filters to apply when querying logs.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of container logs</returns>
    [HttpGet]
    [EnableCors]
    public async Task<ActionResult<IEnumerable<ContainerLog>>> GetAll([FromQuery] LogFiltersDto logFiltersDto, CancellationToken cancellationToken = default)
    {
        var logs = await containerLogsService.GetAll(logFiltersDto.App, logFiltersDto.Take, logFiltersDto.Time, cancellationToken);
        return Ok(logs);
    }
}
