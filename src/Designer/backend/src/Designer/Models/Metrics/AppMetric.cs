using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class AppMetric
{
    public required string Name { get; set; }
    public required IEnumerable<AppMetricDataPoint> DataPoints { get; set; }
}
