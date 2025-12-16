using System.Collections;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class Metric
{
    public required string Name { get; set; }
    public required IEnumerable<string> OperationNames { get; set; }
    public required IEnumerable<MetricApp> Apps { get; set; }
}
