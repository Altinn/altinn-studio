using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

/// <summary>
/// The daily instance metrics of every app of an org in one environment, summed over a period that ends on the
/// last day with stored metrics.
/// </summary>
public sealed record AppDailyMetricsSummary
{
    /// <summary>
    /// How many days the period covers. The period ends on <see cref="MetricDate"/>.
    /// </summary>
    public required int PeriodDays { get; init; }

    /// <summary>
    /// The last day with stored metrics. Null when nothing is stored for the org and environment.
    /// </summary>
    public DateOnly? MetricDate { get; init; }

    /// <summary>
    /// The first day with stored metrics.
    /// </summary>
    public DateOnly? ObservedSince { get; init; }

    /// <summary>
    /// When Storage computed the most recently collected day.
    /// </summary>
    public DateTimeOffset? ComputedAt { get; init; }

    /// <summary>
    /// Every app with stored metrics, whether or not it is still deployed, ordered by name.
    /// </summary>
    public required IReadOnlyList<AppDailyMetricsSummaryRow> Apps { get; init; }
}

public sealed record AppDailyMetricsSummaryRow
{
    public required string App { get; init; }

    /// <summary>
    /// Instances created in the period.
    /// </summary>
    public required int InstancesCreated { get; init; }

    /// <summary>
    /// Instances created in the period of the same length right before.
    /// </summary>
    public required int InstancesCreatedPreviousPeriod { get; init; }

    /// <summary>
    /// Instances completed in the period.
    /// </summary>
    public required int InstancesCompleted { get; init; }

    /// <summary>
    /// Typical seconds from process start to end for the instances completed in the period: the median of the
    /// daily medians, weighted by instances completed per day. Null when none completed.
    /// </summary>
    public int? SecondsToCompleteP50 { get; init; }

    /// <summary>
    /// The last day an instance was created, over everything stored. Null when none was created since
    /// metrics were first stored.
    /// </summary>
    public DateOnly? LastInstanceCreatedOn { get; init; }
}
