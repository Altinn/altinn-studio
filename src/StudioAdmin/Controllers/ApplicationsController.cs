using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("admin/api/v1/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationsService _applicationsService;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(
        IApplicationsService applicationsService,
        ILogger<ApplicationsController> logger
    )
    {
        _applicationsService = applicationsService;
        _logger = logger;
    }

    [HttpGet("{org}")]
    public async Task<ActionResult<Dictionary<string, List<RunningApplication>>>> GetApps(
        string org,
        CancellationToken ct
    )
    {
        try
        {
            var runningApps = await _applicationsService.GetRunningApplications(org, ct);
            return Ok(runningApps);
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
