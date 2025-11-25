using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class AppMetric
{
    public required string AppName { get; set; }
    public required IEnumerable<Metric> Metrics { get; set; }
}
