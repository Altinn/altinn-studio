using System;

namespace Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

/// <summary>
/// One stored row: what happened to one app's instances on one UTC day in one environment.
/// </summary>
public sealed record AppDailyMetricsRecord
{
    public required DateOnly MetricDate { get; init; }
    public required string Org { get; init; }
    public required string App { get; init; }
    public required int InstancesCreated { get; init; }
    public required int InstancesCompleted { get; init; }
    public int? SecondsToCompleteP50 { get; init; }
    public required DateTimeOffset ComputedAt { get; init; }
}
