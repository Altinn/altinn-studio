namespace Altinn.Studio.Admin.Models;

public class Metric
{
    public required string Name { get; set; }
    public required double Count { get; set; }
    public required bool IsError { get; set; }
    public required IEnumerable<MetricDataPoint> DataPoints { get; set; }
}
