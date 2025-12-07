using System.Diagnostics.CodeAnalysis;
using Microsoft.AspNetCore.Mvc;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.Services.Metrics;

namespace StudioGateway.Api.Controllers;

[ApiController]
[Route("/runtime/gateway/api/v1/[controller]")]
[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class MetricsController(IMetricsService metricsService) : ControllerBase
{
    private readonly IMetricsService _metricsService = metricsService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Metric>>> GetMetrics(
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<Metric> metrics = await _metricsService.GetMetricsAsync(app, time, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("health")]
    public async Task<ActionResult<IEnumerable<Metric>>> GetHealthMetrics(
        string app,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<HealthMetric> metrics = await _metricsService.GetHealthMetricsAsync(app, cancellationToken);
        return Ok(metrics);
    }
}
