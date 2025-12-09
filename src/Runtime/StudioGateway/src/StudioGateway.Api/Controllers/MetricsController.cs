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
    public async Task<ActionResult<IEnumerable<Metric>>> GetMetrics(int time, CancellationToken cancellationToken)
    {
        IEnumerable<Metric> metrics = await _metricsService.GetMetricsAsync(time, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app")]
    public async Task<ActionResult<IEnumerable<AppMetric>>> GetAppMetrics(
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<AppMetric> metrics = await _metricsService.GetAppMetricsAsync(app, time, cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("app/health")]
    public async Task<ActionResult<IEnumerable<AppHealthMetric>>> GetAppHealthMetrics(
        string app,
        CancellationToken cancellationToken
    )
    {
        IEnumerable<AppHealthMetric> metrics = await _metricsService.GetAppHealthMetricsAsync(app, cancellationToken);
        return Ok(metrics);
    }
}
