using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("[controller]")]
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

    [HttpGet("{org}", Name = "Apps")]
    public async Task<ActionResult<IEnumerable<RunningApplication>>> Get(string org)
    {
        try
        {
            return Ok(await _applicationsService.GetRunningApplications(org));
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
