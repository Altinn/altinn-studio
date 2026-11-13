using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Admin;

/// <summary>
/// The daily instance metrics that the nightly collection stores per app, for the admin pages.
/// </summary>
[ApiController]
[Authorize(Policy = AltinnPolicy.MustHaveAdminPermission)]
[Route("designer/api/v1/admin/app-daily-metrics/{org}/{env}")]
public class AppDailyMetricsController(IAppDailyMetricsService appDailyMetricsService) : ControllerBase
{
    private const int DefaultPeriodDays = 30;
    private const int MaxPeriodDays = 366;

    /// <summary>
    /// Gets the metrics of every app of the org in the environment, summed over the last <paramref name="days"/>
    /// stored days.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<AppDailyMetricsSummary>> GetSummary(
        string org,
        string env,
        [FromQuery] int days = DefaultPeriodDays,
        CancellationToken cancellationToken = default
    )
    {
        if (!IsValidPeriod(days))
        {
            return BadRequest($"days must be between 1 and {MaxPeriodDays}.");
        }

        return await appDailyMetricsService.GetSummaryAsync(org, env, days, cancellationToken);
    }

    /// <summary>
    /// Gets the metrics of one app, summed over the last <paramref name="days"/> stored days.
    /// </summary>
    [HttpGet("{app}")]
    public async Task<ActionResult<AppDailyMetricsDetails>> GetAppDetails(
        string org,
        string env,
        string app,
        [FromQuery] int days = DefaultPeriodDays,
        CancellationToken cancellationToken = default
    )
    {
        if (!IsValidPeriod(days))
        {
            return BadRequest($"days must be between 1 and {MaxPeriodDays}.");
        }

        return await appDailyMetricsService.GetAppDetailsAsync(org, env, app, days, cancellationToken);
    }

    private static bool IsValidPeriod(int days) => days is >= 1 and <= MaxPeriodDays;
}
