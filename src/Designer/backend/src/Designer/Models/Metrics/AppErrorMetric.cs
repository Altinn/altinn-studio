using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class AppErrorMetric
{
    public required string Name { get; set; }
    public required IEnumerable<AppMetricDataPoint> DataPoints { get; set; }
    public required Uri LogsUrl { get; set; }
}
