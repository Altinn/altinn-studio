using Admin.Models;
using Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers;

[ApiController]
[Route("[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationsService _applicationsService;
    private readonly ILogger<InstancesController> _logger;

    public ApplicationsController(
        IApplicationsService applicationsService,
        ILogger<InstancesController> logger
    )
    {
        _applicationsService = applicationsService;
        _logger = logger;
    }

    [HttpGet("{org}", Name = "Apps")]
    public async Task<IEnumerable<RunningApplication>> Get(string org)
    {
        return await _applicationsService.GetRunningApplications(org);
    }
}
