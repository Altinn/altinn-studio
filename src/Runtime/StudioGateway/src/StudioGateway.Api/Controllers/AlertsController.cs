using System.Diagnostics.CodeAnalysis;
using Microsoft.AspNetCore.Mvc;
using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.Services.Alerts;

namespace StudioGateway.Api.Controllers;

[ApiController]
[Route("/runtime/gateway/api/v1/[controller]")]
[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class AlertsController(IAlertsService alertsService) : ControllerBase
{
    private readonly IAlertsService _alertsService = alertsService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Alert>>> GetFiringAlerts(CancellationToken cancellationToken)
    {
        IEnumerable<Alert> alerts = await _alertsService.GetFiringAlertsAsync(cancellationToken);
        return Ok(alerts);
    }

    [HttpPost]
    public async Task<ActionResult> UpsertFiringAlert(CancellationToken cancellationToken)
    {
        await _alertsService.UpsertFiringAlertsAsync(cancellationToken);
        return Ok();
    }
}
