using Microsoft.AspNetCore.Mvc;
using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.Services.Alerts;

namespace StudioGateway.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AlertsController(
    IAlertsService alertsService
    ) : ControllerBase
{
    private readonly IAlertsService _alertsService = alertsService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Alert>>> GetFiringAlerts(CancellationToken cancellationToken)
    {
        IEnumerable<Alert> alerts = await _alertsService.GetFiringAlertsAsync(cancellationToken);

        return Ok(alerts);
    }
}
