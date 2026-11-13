using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Reads the daily instance metrics that the nightly collection stores, summed over a period.
/// </summary>
public interface IAppDailyMetricsService
{
    Task<AppDailyMetricsSummary> GetSummaryAsync(
        string org,
        string environment,
        int periodDays,
        CancellationToken cancellationToken = default
    );

    Task<AppDailyMetricsDetails> GetAppDetailsAsync(
        string org,
        string environment,
        string app,
        int periodDays,
        CancellationToken cancellationToken = default
    );
}
