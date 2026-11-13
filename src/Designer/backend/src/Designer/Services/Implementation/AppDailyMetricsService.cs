using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppDailyMetricsService : IAppDailyMetricsService
{
    private readonly IAppDailyMetricsRepository _repository;

    public AppDailyMetricsService(IAppDailyMetricsRepository repository)
    {
        _repository = repository;
    }

    public async Task<AppDailyMetricsSummary> GetSummaryAsync(
        string org,
        string environment,
        int periodDays,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(periodDays);

        var coverage = await _repository.GetCoverageAsync(org, environment, cancellationToken);
        if (coverage is null)
        {
            return new AppDailyMetricsSummary { PeriodDays = periodDays, Apps = [] };
        }

        var window = Window.Of(coverage.LatestMetricDate, periodDays);
        var rows = await _repository.GetRowsAsync(org, environment, window.From, window.To, cancellationToken);
        var lastCreatedOn = await _repository.GetLastInstanceCreatedOnAsync(org, environment, cancellationToken);

        var apps = rows.Select(row => row.App)
            .Concat(lastCreatedOn.Keys)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .Select(app => Summarize(app, rows, lastCreatedOn, window))
            .ToList();

        return new AppDailyMetricsSummary
        {
            PeriodDays = periodDays,
            MetricDate = coverage.LatestMetricDate,
            ObservedSince = coverage.ObservedSince,
            ComputedAt = coverage.LatestComputedAt,
            Apps = apps,
        };
    }

    public async Task<AppDailyMetricsDetails> GetAppDetailsAsync(
        string org,
        string environment,
        string app,
        int periodDays,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(periodDays);

        var coverage = await _repository.GetCoverageAsync(org, environment, cancellationToken);
        if (coverage is null)
        {
            return new AppDailyMetricsDetails
            {
                PeriodDays = periodDays,
                Metrics = Summarize(app, [], new Dictionary<string, DateOnly>(), null),
            };
        }

        var window = Window.Of(coverage.LatestMetricDate, periodDays);
        var rows = (await _repository.GetRowsAsync(org, environment, window.From, window.To, cancellationToken))
            .Where(row => row.App == app)
            .ToList();
        var lastCreatedOn = await _repository.GetLastInstanceCreatedOnAsync(org, environment, cancellationToken);

        return new AppDailyMetricsDetails
        {
            PeriodDays = periodDays,
            MetricDate = coverage.LatestMetricDate,
            ObservedSince = coverage.ObservedSince,
            ComputedAt = coverage.LatestComputedAt,
            Metrics = Summarize(app, rows, lastCreatedOn, window),
        };
    }

    private static AppDailyMetricsSummaryRow Summarize(
        string app,
        IReadOnlyList<AppDailyMetricsRecord> rows,
        IReadOnlyDictionary<string, DateOnly> lastCreatedOn,
        Window? window
    )
    {
        var appRows = rows.Where(row => row.App == app).ToList();
        var period = appRows.Where(row => window is not null && window.InPeriod(row.MetricDate)).ToList();
        var previous = appRows.Where(row => window is not null && window.InPreviousPeriod(row.MetricDate));

        return new AppDailyMetricsSummaryRow
        {
            App = app,
            InstancesCreated = period.Sum(row => row.InstancesCreated),
            InstancesCreatedPreviousPeriod = previous.Sum(row => row.InstancesCreated),
            InstancesCompleted = period.Sum(row => row.InstancesCompleted),
            SecondsToCompleteP50 = WeightedMedian(period),
            LastInstanceCreatedOn = lastCreatedOn.TryGetValue(app, out var date) ? date : null,
        };
    }

    /// <summary>
    /// The median of the daily medians, each weighted by the instances completed that day. The exact median of
    /// all instances is not derivable from daily medians; this is the closest the stored data allows.
    /// </summary>
    private static int? WeightedMedian(IEnumerable<AppDailyMetricsRecord> rows)
    {
        var days = rows.Where(row => row.SecondsToCompleteP50 is not null && row.InstancesCompleted > 0)
            .OrderBy(row => row.SecondsToCompleteP50)
            .ToList();
        if (days.Count == 0)
        {
            return null;
        }

        var total = days.Sum(row => (long)row.InstancesCompleted);
        long cumulative = 0;
        foreach (var day in days)
        {
            cumulative += day.InstancesCompleted;
            if (cumulative * 2 >= total)
            {
                return day.SecondsToCompleteP50;
            }
        }

        return days[^1].SecondsToCompleteP50;
    }

    /// <summary>
    /// The period ends on the last stored day; the previous period is the same number of days right before it.
    /// </summary>
    private sealed record Window(DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly PreviousStart)
    {
        public DateOnly From => PreviousStart;
        public DateOnly To => PeriodEnd;

        public bool InPeriod(DateOnly date) => date >= PeriodStart && date <= PeriodEnd;

        public bool InPreviousPeriod(DateOnly date) => date >= PreviousStart && date < PeriodStart;

        public static Window Of(DateOnly periodEnd, int periodDays)
        {
            var periodStart = periodEnd.AddDays(-(periodDays - 1));
            return new Window(periodStart, periodEnd, periodStart.AddDays(-periodDays));
        }
    }
}
