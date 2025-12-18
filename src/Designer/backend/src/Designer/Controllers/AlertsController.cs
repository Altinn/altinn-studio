using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
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
    public async Task<ActionResult<IEnumerable<AlertRule>>> GetAlertRules(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        var environment = AltinnEnvironment.FromName(env);
        IEnumerable<AlertRule> alertRules = await _alertsService.GetAlertRulesAsync(org, environment, cancellationToken);
        return Ok(alertRules);
    }

    [HttpPost]
    [Authorize(MaskinportenConstants.AuthorizationPolicy)]
    public async Task<ActionResult> NotifyAlertsUpdated(
        string org,
        string env,
        CancellationToken cancellationToken
    )
    {
        var environment = AltinnEnvironment.FromName(env);
        await _alertsService.NotifyAlertsUpdatedAsync(org, environment, cancellationToken);
        return Ok();
    }
}
