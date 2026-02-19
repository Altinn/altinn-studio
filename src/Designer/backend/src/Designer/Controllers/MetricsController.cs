using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize(Policy = AltinnPolicy.MustHaveAdminPermission)]
[Route("designer/api/v1/admin/[controller]/{org}/{env}")]
public class MetricsController(IMetricsService metricsService) : ControllerBase
{
    private readonly IMetricsService _metricsService = metricsService;

    [HttpGet("errors")]
    public async Task<ActionResult<IEnumerable<ErrorMetric>>> GetErrorMetrics(
        string org,
        string env,
        int range,
        CancellationToken cancellationToken
    )
    {
        var environment = AltinnEnvironment.FromName(env);
        IEnumerable<ErrorMetric> metrics = await _metricsService.GetErrorMetricsAsync(org, environment, range, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app")]
    public async Task<ActionResult<IEnumerable<AppMetric>>> GetAppMetrics(
        string org,
        string env,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        var environment = AltinnEnvironment.FromName(env);
        IEnumerable<AppMetric> metrics = await _metricsService.GetAppMetricsAsync(org, environment, app, range, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app/errors")]
    public async Task<ActionResult<IEnumerable<AppErrorMetric>>> GetAppErrorMetrics(
        string org,
        string env,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        var environment = AltinnEnvironment.FromName(env);
        IEnumerable<AppErrorMetric> metrics = await _metricsService.GetAppErrorMetricsAsync(org, environment, app, range, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app/health")]
    public async Task<ActionResult<IEnumerable<AppHealthMetric>>> GetAppHealthMetrics(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        var environment = AltinnEnvironment.FromName(env);
        IEnumerable<AppHealthMetric> metrics = await _metricsService.GetAppHealthMetricsAsync(org, environment, app, cancellationToken);
        return Ok(metrics);
    }
}
