using System;

namespace Altinn.Studio.Designer.Models.Metrics;

/// <summary>
/// The daily instance metrics of one app, summed over a period that ends on the last day with stored metrics.
/// </summary>
public sealed record AppDailyMetricsDetails
{
    public required int PeriodDays { get; init; }
    public DateOnly? MetricDate { get; init; }
    public DateOnly? ObservedSince { get; init; }
    public DateTimeOffset? ComputedAt { get; init; }
    public required AppDailyMetricsSummaryRow Metrics { get; init; }
}
