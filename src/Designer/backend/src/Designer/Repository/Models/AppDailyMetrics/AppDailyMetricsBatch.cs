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

    public required IReadOnlyList<AppDailyMetricsObservation> Observations { get; init; }
}
