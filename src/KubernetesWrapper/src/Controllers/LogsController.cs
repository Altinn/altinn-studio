using KubernetesWrapper.Models;
using KubernetesWrapper.Models.Dto;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to logs
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="LogsController"/> class
/// </remarks>
/// <param name="logsService">The service</param>
[Route("api/v1/[controller]")]
[ApiController]
public class LogsController(ILogsService logsService) : ControllerBase
{
    /// <summary>
    /// Get all logs
    /// </summary>
    /// <param name="logFiltersDto">The filters to apply when querying logs.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of logs</returns>
    [HttpGet]
    [EnableCors]
    public async Task<ActionResult<IEnumerable<Log>>> GetAll([FromQuery] LogFiltersDto logFiltersDto, CancellationToken cancellationToken = default)
    {
        var logs = await logsService.GetAll(logFiltersDto.App, logFiltersDto.Take, logFiltersDto.Time, cancellationToken);
        return Ok(logs);
    }
}
