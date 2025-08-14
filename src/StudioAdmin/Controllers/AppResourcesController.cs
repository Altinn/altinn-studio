using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("admin/api/v1/app-resources")]
public class AppResourcesController : ControllerBase
{
    private readonly IAppResourcesService _appResourcesService;
    private readonly ILogger<InstancesController> _logger;

    public AppResourcesController(
        IAppResourcesService appResourcesService,
        ILogger<InstancesController> logger
    )
    {
        _appResourcesService = appResourcesService;
        _logger = logger;
    }

    [HttpGet("{org}/{env}/{app}/process-tasks")]
    public async Task<ActionResult<IEnumerable<ProcessTask>>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        try
        {
            return Ok(await _appResourcesService.GetProcessTasks(org, env, app, ct));
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
