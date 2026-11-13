using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;

public sealed record AppDailyMetricsObservation
{
    public required string App { get; init; }
    public required int InstancesCreated { get; init; }
    public required int InstancesCompleted { get; init; }
    public int? SecondsToCompleteP50 { get; init; }
    public required int OpenInstances { get; init; }
    public required int OpenOver90Days { get; init; }

    /// <summary>
    /// Open instances per process task id.
    /// </summary>
    public required IReadOnlyDictionary<string, int> OpenByTask { get; init; }
}
