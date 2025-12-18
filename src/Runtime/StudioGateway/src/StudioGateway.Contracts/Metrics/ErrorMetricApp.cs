namespace StudioGateway.Contracts.Metrics;

public class ErrorMetricApp
{
    public required string AppName { get; set; }
    public required double Count { get; set; }
}
