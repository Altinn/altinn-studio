namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class Metric
{
    public required string AppName { get; set; }
    public required string Name { get; set; }
    public required IEnumerable<long> Timestamps { get; set; }
    public required IEnumerable<double> Counts { get; set; }
    public required int BucketSize { get; set; }
}
