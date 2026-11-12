namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class AllAppsErrorMetric
{
    public required string AppName { get; set; }
    public required string Name { get; set; }
    public required IEnumerable<long> Timestamps { get; set; }
    public required IEnumerable<double> Counts { get; set; }

    /// <summary>
    /// The count for the whole time range. Use it instead of summing <see cref="Counts"/>, which counts an instance
    /// once in each bucket it failed in.
    /// </summary>
    public required double Count { get; set; }

    public required int BucketSize { get; set; }
    public required Uri LogsUrl { get; set; }
}
