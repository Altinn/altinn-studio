namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class AppErrorMetric
{
    public required string Name { get; set; }
    public required IEnumerable<AppMetricDataPoint> DataPoints { get; set; }
    public required Uri LogsUrl { get; set; }
}
