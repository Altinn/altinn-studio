using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Route("designer/api/admin/[controller]/{org}/{env}")]
public class MetricsController(IMetricsService metricsService) : ControllerBase
{
    private readonly IMetricsService _metricsService = metricsService;

    [HttpGet]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IEnumerable<AppMetric>>> GetMetrics(
        string org,
        string env,
        int time,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<Metric> metrics = await _metricsService.GetMetricsAsync(org, env, time, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IEnumerable<AppMetric>>> GetAppMetrics(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<AppMetric> metrics = await _metricsService.GetAppMetricsAsync(org, env, app, time, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app/health")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IEnumerable<AppHealthMetric>>> GetAppHealthMetrics(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<AppHealthMetric> healthMetrics = await _metricsService.GetAppHealthMetricsAsync(org, env, app, cancellationToken);
        return Ok(healthMetrics);
    }
}
