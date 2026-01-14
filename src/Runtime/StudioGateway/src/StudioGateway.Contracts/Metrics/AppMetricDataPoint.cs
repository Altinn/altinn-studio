namespace StudioGateway.Contracts.Metrics;

public class AppMetricDataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public double Count { get; set; }
}
