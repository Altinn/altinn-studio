using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class Metric
{
    public required string Name { get; set; }
    public required double Count { get; set; }
    public required bool IsError { get; set; }
    public required IEnumerable<MetricDataPoint> DataPoints { get; set; }
}
