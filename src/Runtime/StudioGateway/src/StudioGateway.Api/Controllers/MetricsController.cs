using Microsoft.AspNetCore.Mvc;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.Services.Metrics;

namespace StudioGateway.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MetricsController(
    IMetricsService metricsService
    ) : ControllerBase
{
    private readonly IMetricsService _metricsService = metricsService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppMetric>>> GetMetrics(string app, int time, CancellationToken cancellationToken)
    {
        IEnumerable<AppMetric> metrics = await _metricsService.GetMetricsAsync(app, time, cancellationToken);
        return Ok(metrics);
    }
}
