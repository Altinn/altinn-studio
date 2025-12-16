namespace StudioGateway.Contracts.Metrics;

public class Metric
{
    public required string Name { get; set; }
    public required IEnumerable<string> OperationNames { get; set; }
    public required IEnumerable<MetricApp> Apps { get; set; }
}
