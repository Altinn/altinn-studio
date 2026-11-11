using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

/// <summary>
/// One app's instance metrics for one UTC day in one environment. The created, completed and time to complete
/// columns describe the day. The open and unconfirmed columns are a snapshot taken when the day had just ended,
/// and are null when the row was filled in later.
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
    public int? OpenInstances { get; set; }
    public int? OpenOver90Days { get; set; }
    public int? UnconfirmedOver90Days { get; set; }
    public DateTimeOffset ComputedAt { get; set; }
}
