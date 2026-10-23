using System;

namespace Altinn.Studio.Designer.Repository.Models.AppActivity;

/// <summary>
/// The tracked activity of an app in an environment.
/// </summary>
public sealed record AppActivityRecord
{
    public required string App { get; init; }
    public DateTimeOffset? LastWriteAt { get; init; }
    public required DateTimeOffset ObservedSince { get; init; }
    public required DateTimeOffset LastCollectedAt { get; init; }
}
