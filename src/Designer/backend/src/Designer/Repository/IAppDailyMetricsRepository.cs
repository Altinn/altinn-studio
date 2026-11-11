using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

namespace Altinn.Studio.Designer.Repository;

public interface IAppDailyMetricsRepository
{
    /// <summary>
    /// Stores the metrics of one org, environment and day, replacing what an earlier run stored for the same day.
    /// </summary>
    Task UpsertDayAsync(AppDailyMetricsBatch batch, CancellationToken cancellationToken = default);
}
