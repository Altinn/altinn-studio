namespace StudioGateway.Contracts.Metrics;

public class ErrorMetricsResponse
{
    public required string SubscriptionId { get; set; }
    public required IEnumerable<ErrorMetric> Metrics { get; set; }
}
