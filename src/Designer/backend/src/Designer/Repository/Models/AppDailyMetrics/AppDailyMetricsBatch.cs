using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

/// <summary>
/// The metrics of every app of an org in one environment for one UTC day, as collected in one run.
/// </summary>
public sealed record AppDailyMetricsBatch
{
    public required string Org { get; init; }
    public required string Environment { get; init; }
    public required DateOnly MetricDate { get; init; }
    public required DateTimeOffset ComputedAt { get; init; }

    /// <summary>
    /// Whether the open counts in the observations describe the end of <see cref="MetricDate"/>.
    /// They do only when the run collected yesterday. When false, the counts are not stored, so a day filled in
    /// later keeps whatever snapshot it already has.
    /// </summary>
    public required bool IncludesSnapshot { get; init; }

    public required IReadOnlyList<AppDailyMetricsObservation> Observations { get; init; }
}
