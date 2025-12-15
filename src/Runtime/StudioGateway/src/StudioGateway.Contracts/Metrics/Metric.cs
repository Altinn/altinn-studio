namespace StudioGateway.Contracts.Metrics;

public class Metric
{
    public required string Name { get; set; }
    public required string AppName { get; set; }
    public required double Count { get; set; }
}
