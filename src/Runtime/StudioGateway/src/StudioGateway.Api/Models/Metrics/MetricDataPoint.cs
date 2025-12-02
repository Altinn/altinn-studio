namespace StudioGateway.Api.Models.Metrics;

internal sealed class MetricDataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public double Count { get; set; }
}
