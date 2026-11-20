namespace Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

public sealed record AppDailyMetricsObservation
{
    public required string App { get; init; }
    public required int InstancesCreated { get; init; }
    public required int InstancesCompleted { get; init; }
    public int? SecondsToCompleteP50 { get; init; }
}
