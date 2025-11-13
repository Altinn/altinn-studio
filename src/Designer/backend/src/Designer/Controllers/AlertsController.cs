using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Route("designer/api/admin/[controller]/{org}/{env}")]
public class AlertsController(IAlertsService alertsService) : ControllerBase
{
    private readonly IAlertsService _alertsService = alertsService;

    [HttpGet]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IEnumerable<Alert>>> GetFiringAlerts(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<Alert> alerts = await _alertsService.GetFiringAlertsAsync(org, env, cancellationToken);
        return Ok(alerts);
    }

    [HttpPost]
    public async Task<ActionResult> UpsertFiringAlerts(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        await _alertsService.UpsertFiringAlertsAsync(org, env, cancellationToken);
        return Ok();
    }
}
