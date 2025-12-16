namespace StudioGateway.Contracts.Metrics;

public class MetricsResponse
{
    public required string SubscriptionId { get; set; }
    public required IEnumerable<Metric> Metrics { get; set; }
}
