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
    public async Task<ActionResult<IEnumerable<Metric>>> GetMetrics(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<Metric> metrics = await _metricsService.GetMetricsAsync(org, env, app, time, cancellationToken);
        return Ok(metrics);
    }
}
