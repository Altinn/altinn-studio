namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class ErrorMetric
{
    public required string Name { get; set; }
    public required string AppName { get; set; }
    public required double Count { get; set; }
    public required Uri LogsUrl { get; set; }
}
