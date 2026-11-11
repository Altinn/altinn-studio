using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

/// <summary>
/// Open instances per process task for one app, environment and UTC day, from the same snapshot as the
/// open instance count in <see cref="AppDailyMetricsDbModel"/>.
/// </summary>
public class AppDailyTaskMetricsDbModel
{
    public long Id { get; set; }
    public DateOnly MetricDate { get; set; }
    public required string Org { get; set; }
    public required string Environment { get; set; }
    public required string App { get; set; }
    public required string TaskId { get; set; }
    public int OpenInstances { get; set; }
}
