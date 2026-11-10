using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.AppActivity;

/// <summary>
/// The result of one activity collection for all apps of an org in one environment.
/// Tracked apps of the org and environment that are not part of the batch are marked as not deployed.
/// </summary>
public sealed record AppActivityCollectionBatch
{
    public required string Org { get; init; }
    public required string Environment { get; init; }
    public required DateTimeOffset CollectedAt { get; init; }
    public required int WindowDays { get; init; }
    public required IReadOnlyList<AppActivityObservation> Observations { get; init; }
}
