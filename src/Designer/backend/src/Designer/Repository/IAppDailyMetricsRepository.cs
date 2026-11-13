using System;
using System.Collections.Generic;
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

    /// <summary>
    /// Gets which days the stored metrics of an org and environment cover. Null when nothing is stored.
    /// </summary>
    Task<AppDailyMetricsCoverage?> GetCoverageAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets every stored row of an org and environment from <paramref name="fromDate"/> to
    /// <paramref name="toDate"/>, both inclusive.
    /// </summary>
    Task<IReadOnlyList<AppDailyMetricsRecord>> GetRowsAsync(
        string org,
        string environment,
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets, per app, the last day on which at least one instance was created, over everything stored.
    /// </summary>
    Task<IReadOnlyDictionary<string, DateOnly>> GetLastInstanceCreatedOnAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    );
}
