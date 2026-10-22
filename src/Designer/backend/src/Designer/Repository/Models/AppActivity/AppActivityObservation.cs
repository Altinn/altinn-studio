using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.AppActivity;

public sealed record AppActivityObservation
{
    public required string App { get; init; }
    public required bool Deployed { get; init; }
    public DateTimeOffset? LastReadAt { get; init; }
    public DateTimeOffset? LastWriteAt { get; init; }
    public required IReadOnlyDictionary<string, double> WindowCounts { get; init; }
}
