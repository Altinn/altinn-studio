using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

/// <summary>
/// What happened to one app's instances on one UTC day in one environment.
/// </summary>
public class AppDailyMetricsDbModel
{
    public long Id { get; set; }
    public DateOnly MetricDate { get; set; }
    public required string Org { get; set; }
    public required string Environment { get; set; }
    public required string App { get; set; }
    public int InstancesCreated { get; set; }
    public int InstancesCompleted { get; set; }
    public int? SecondsToCompleteP50 { get; set; }

    /// <summary>
    /// When Storage computed the row.
    /// </summary>
    public DateTimeOffset ComputedAt { get; set; }
}
