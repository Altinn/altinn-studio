using KubernetesWrapper.Models;
using KubernetesWrapper.Models.Dto;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers;

/// <summary>
///  Controller containing all actions related to application exceptions
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="AppExceptionsController"/> class
/// </remarks>
/// <param name="appExceptionsService">The service</param>
[Route("api/v1/[controller]")]
[ApiController]
public class AppExceptionsController(IAppExceptionsService appExceptionsService) : ControllerBase
{
    /// <summary>
    /// Get all application exceptions
    /// </summary>
    /// <param name="logFiltersDto">The filters to apply when querying logs.</param>
    /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The list of application exceptions</returns>
    [HttpGet]
    [EnableCors]
    public async Task<ActionResult<long?>> GetAll([FromQuery] LogFiltersDto logFiltersDto, CancellationToken cancellationToken = default)
    {
        var logs = await appExceptionsService.GetAll(logFiltersDto.App, logFiltersDto.Take, logFiltersDto.Time, cancellationToken);
        return Ok(logs);
    }
}
