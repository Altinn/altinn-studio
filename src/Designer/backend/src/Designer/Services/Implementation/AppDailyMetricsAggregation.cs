using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Sums stored daily rows into the per-app numbers the admin pages show. Shared by the per-org and the
/// platform-wide services so the two never disagree.
/// </summary>
internal static class AppDailyMetricsAggregation
{
    /// <summary>
    /// The period ends on the last stored day; the previous period is the same number of days right before it.
    /// </summary>
    internal sealed record Window(DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly PreviousStart)
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

    /// <summary>
    /// Sums one app's rows. <paramref name="rows"/> holds only that app's rows; <paramref name="window"/> is null
    /// when nothing is stored.
    /// </summary>
    internal static AppDailyMetricsSummaryRow Summarize(
        string app,
        IReadOnlyList<AppDailyMetricsRecord> rows,
        DateOnly? lastInstanceCreatedOn,
        Window? window
    )
    {
        var period = rows.Where(row => window is not null && window.InPeriod(row.MetricDate)).ToList();
        var previous = rows.Where(row => window is not null && window.InPreviousPeriod(row.MetricDate));

        return new AppDailyMetricsSummaryRow
        {
            App = app,
            InstancesCreated = period.Sum(row => row.InstancesCreated),
            InstancesCreatedPreviousPeriod = previous.Sum(row => row.InstancesCreated),
            InstancesCompleted = period.Sum(row => row.InstancesCompleted),
            SecondsToCompleteP50 = WeightedMedian(period),
            LastInstanceCreatedOn = lastInstanceCreatedOn,
        };
    }

    /// <summary>
    /// The median of the daily medians, each weighted by the instances completed that day. The exact median of
    /// all instances is not derivable from daily medians; this is the closest the stored data allows.
    /// </summary>
    internal static int? WeightedMedian(IEnumerable<AppDailyMetricsRecord> rows)
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
}
