namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class AppHealthMetric
{
    public required string Name { get; set; }
    public required double Count { get; set; }
}
