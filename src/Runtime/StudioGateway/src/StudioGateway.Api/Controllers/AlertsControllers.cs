using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using StudioGateway.Api.Models;
using StudioGateway.Api.Services.Alerts;

namespace StudioGateway.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]/{org}/{env}")]
public class AlertsController(
    IAlertsService alertsService,
    ILogger<AlertsController> logger
    ) : ControllerBase
{
    private readonly IAlertsService _alertsService = alertsService;
    private readonly ILogger<AlertsController> _logger = logger;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Alert>>> GetFiringAlerts(
        string org,
        string env,
        CancellationToken ct
    )
    {
        IEnumerable<Alert> alerts = await _alertsService.GetFiringAlertsAsync(org, env, ct);

        return Ok(alerts);
    }
}
