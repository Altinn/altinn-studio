using System;

namespace Altinn.Studio.Designer.Models.Metrics;

public class AppMetricDataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public double Count { get; set; }
}
