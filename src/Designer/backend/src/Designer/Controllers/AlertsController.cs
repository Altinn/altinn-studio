using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.App.Core.Internal.Secrets;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Route("designer/api/admin/[controller]/{org}/{env}")]
public class AlertsController(
    IAlertsService alertsService,
    ILogger<AlertsController> logger,
    ISecretsClient secretsClient,
    HttpClient httpClient
    ) : ControllerBase
{
    private readonly IAlertsService _alertsService = alertsService;
    private readonly ILogger<AlertsController> _logger = logger;
    private readonly ISecretsClient _secretsClient = secretsClient;
    private readonly HttpClient _httpClient = httpClient;

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

    [HttpPost]
    public async Task<ActionResult> Upsert(
        string org,
        string env,
        CancellationToken ct
    )
    {
        string apiToken = await _secretsClient.GetSecretAsync("admin-api-token");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        string authHeader = Request.Headers["Authorization"].ToString();
        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized();
        }

        string providedToken = authHeader.Substring("Bearer ".Length).Trim();
        if (!CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(apiToken),
                Convert.FromHexString(providedToken)))
        {
            return Unauthorized();
        }

        await _alertsService.UpsertFiringAlerts(org, env, ct);
        return Ok();
    }
}
