using KubernetesWrapper.Models;
using KubernetesWrapper.Models.Dto;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to failed requests
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="AppFailedRequestsController"/> class
/// </remarks>
/// <param name="appFailedRequestsService">The service</param>
[Route("api/v1/[controller]")]
[ApiController]
public class AppFailedRequestsController(IAppFailedRequestsService appFailedRequestsService) : ControllerBase
{
    /// <summary>
    /// Get all failed requests
    /// </summary>
    /// <param name="logFiltersDto">The filters to apply when querying logs.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of failed requests</returns>
    [HttpGet]
    [EnableCors]
    public async Task<ActionResult<IEnumerable<AppFailedRequest>>> GetAll([FromQuery] LogFiltersDto logFiltersDto, CancellationToken cancellationToken = default)
    {
        var logs = await appFailedRequestsService.GetAll(logFiltersDto.App, logFiltersDto.Take, logFiltersDto.Time, cancellationToken);
        return Ok(logs);
    }
}
