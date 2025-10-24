using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Route("designer/api/admin/[controller]")]
public class AlertsController(
    IAlertsService alertsService,
    ILogger<AlertsController> logger
    ) : ControllerBase
{
    private readonly IAlertsService _alertsService = alertsService;
    private readonly ILogger<AlertsController> _logger = logger;

    [HttpGet("{org}/{env}/firing-alerts")]
    public async Task<ActionResult<IEnumerable<Alert>>> GetFiringAlerts(
        string org,
        string env,
        CancellationToken ct
    )
    {
        IEnumerable<Alert> alerts = await _alertsService.GetFiringAlerts(org, env, ct);
        return Ok(alerts);
    }
}
