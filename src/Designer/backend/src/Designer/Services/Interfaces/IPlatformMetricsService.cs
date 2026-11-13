using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Reads the stored daily instance metrics across every service owner, for the platform-wide admin pages.
/// </summary>
public interface IPlatformMetricsService
{
    Task<PlatformAppDailyMetrics> GetAppDailyMetricsAsync(
        string environment,
        int periodDays,
        CancellationToken cancellationToken = default
    );
}
