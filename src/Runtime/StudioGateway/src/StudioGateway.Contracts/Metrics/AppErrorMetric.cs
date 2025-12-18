namespace StudioGateway.Contracts.Metrics;

public class AppErrorMetric
{
    public required string Name { get; set; }
    public required IEnumerable<string> OperationNames { get; set; }
    public required IEnumerable<AppMetricDataPoint> DataPoints { get; set; }
}
