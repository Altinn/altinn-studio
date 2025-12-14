using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
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
    [Authorize(Policy = AltinnPolicy.MustHaveAdminPermission)]
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
    [Authorize(MaskinportenConstants.AuthorizationPolicy)]
    public async Task<ActionResult> NotifyAlertsUpdated(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        await _alertsService.NotifyAlertsUpdatedAsync(org, env, cancellationToken);
        return Ok();
    }
}
