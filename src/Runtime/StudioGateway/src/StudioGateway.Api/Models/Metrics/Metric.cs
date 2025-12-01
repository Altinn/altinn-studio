namespace StudioGateway.Api.Models.Metrics;

public class Metric
{
    public required string Name { get; set; }
    public required IEnumerable<MetricDataPoint> DataPoints { get; set; }
}
