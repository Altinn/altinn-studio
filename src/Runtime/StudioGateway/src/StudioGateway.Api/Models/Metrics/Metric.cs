namespace StudioGateway.Api.Models.Metrics;

internal sealed class Metric
{
    public required string Name { get; set; }
    public required IEnumerable<MetricDataPoint> DataPoints { get; set; }
}
