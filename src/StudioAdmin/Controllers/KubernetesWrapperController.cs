using System.Text.Json;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("admin/api/v1/[controller]/{org}/{env}")]
public class KubernetesWrapperController(
    IKubernetesWrapperService kubernetesWrapperService,
    ILogger<ApplicationsController> logger
    ) : ControllerBase
{
    private readonly IKubernetesWrapperService _kubernetesWrapperService = kubernetesWrapperService;
    private readonly ILogger<ApplicationsController> _logger = logger;


    [HttpGet("appexceptions")]
    public async Task<ActionResult<Log>> GetAppExceptions(
        string org,
        string env,
        CancellationToken ct,
        [FromQuery] string? app,
        [FromQuery] int time = 24
    )
    {
        try
        {
            var appExceptions = await _kubernetesWrapperService.GetAppExceptions(org, env, time, app, ct);
            return Ok(appExceptions);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
    }

    [HttpGet("appfailedrequests")]
    public async Task<ActionResult<Log>> GetAppFailedRequests(
        string org,
        string env,
        CancellationToken ct,
        [FromQuery] string? app,
        [FromQuery] int time = 24
    )
    {
        try
        {
            var appFailedRequests = await _kubernetesWrapperService.GetAppFailedRequests(org, env, time, app, ct);
            return Ok(appFailedRequests);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
    }

    [HttpGet("containerlogs")]
    public async Task<ActionResult<IEnumerable<ContainerLog>>> GetContainerLogs(
        string org,
        string env,
        CancellationToken ct,
        [FromQuery] string? app,
        [FromQuery] int time = 24
    )
    {
        try
        {
            var containerLogs = await _kubernetesWrapperService.GetContainerLogs(org, env, time, app, ct);
            return Ok(containerLogs);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
    }
}
