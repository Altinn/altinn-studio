namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class AppMetric
{
    public required string Name { get; set; }
    public required IEnumerable<AppMetricDataPoint> DataPoints { get; set; }
}
