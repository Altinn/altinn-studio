namespace Altinn.Studio.Admin.Models;

public class AppMetric
{
    public required string AppName { get; set; }
    public required IEnumerable<Metric> Metrics { get; set; }
}
