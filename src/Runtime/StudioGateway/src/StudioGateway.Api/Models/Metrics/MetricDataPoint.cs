namespace StudioGateway.Api.Models.Metrics;

public class MetricDataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public double Count { get; set; }
}
