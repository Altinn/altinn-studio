using System;

namespace Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

/// <summary>
/// Which days the daily metrics of an org and environment cover.
/// </summary>
public sealed record AppDailyMetricsCoverage
{
    /// <summary>
    /// The first day with stored metrics.
    /// </summary>
    public required DateOnly ObservedSince { get; init; }

    /// <summary>
    /// The last day with stored metrics.
    /// </summary>
    public required DateOnly LatestMetricDate { get; init; }

    /// <summary>
    /// When Storage computed the most recently collected row.
    /// </summary>
    public required DateTimeOffset LatestComputedAt { get; init; }
}
