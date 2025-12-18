namespace StudioGateway.Contracts.Metrics;

public class ErrorMetric
{
    public required string Name { get; set; }
    public required IEnumerable<string> OperationNames { get; set; }
    public required IEnumerable<ErrorMetricApp> Apps { get; set; }
}
