using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Platform;

/// <summary>
/// The daily instance metrics of every service owner, for the platform-wide admin pages of the Studio team.
/// </summary>
[ApiController]
[Authorize(Policy = AltinnPolicy.MustHaveStudioPlatformAccess)]
[Route("designer/api/v1/platform/app-daily-metrics")]
public class PlatformMetricsController(IPlatformMetricsService platformMetricsService) : ControllerBase
{
    private const int DefaultPeriodDays = 30;
    private const int MaxPeriodDays = 366;

    /// <summary>
    /// Gets the metrics of every app of every service owner in an environment, summed over the last
    /// <paramref name="days"/> stored days.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PlatformAppDailyMetrics>> GetAppDailyMetrics(
        [FromQuery] string env,
        [FromQuery] int days = DefaultPeriodDays,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            Guard.AssertValidEnvironmentName(env);
        }
        catch (ArgumentException)
        {
            return BadRequest("env must be an environment name.");
        }

        if (days is < 1 or > MaxPeriodDays)
        {
            return BadRequest($"days must be between 1 and {MaxPeriodDays}.");
        }

        return await platformMetricsService.GetAppDailyMetricsAsync(env, days, cancellationToken);
    }
}
