using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class AppActivityDbModel
{
    public long Id { get; set; }
    public required string Org { get; set; }
    public required string Environment { get; set; }
    public required string App { get; set; }
    public DateTimeOffset? LastReadAt { get; set; }
    public DateTimeOffset? LastWriteAt { get; set; }

    /// <summary>
    /// Category to count map from the most recent collection, serialized as JSON.
    /// </summary>
    public required string LatestWindowCounts { get; set; }
    public int LatestWindowDays { get; set; }
    public DateTimeOffset ObservedSince { get; set; }
    public bool Deployed { get; set; }
    public DateTimeOffset FirstCollectedAt { get; set; }
    public DateTimeOffset LastCollectedAt { get; set; }
}
