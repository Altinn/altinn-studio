using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class AllAppsErrorMetric
{
    public required string AppName { get; set; }
    public required string Name { get; set; }
    public required IEnumerable<long> Timestamps { get; set; }
    public required IEnumerable<double> Counts { get; set; }
    public required int BucketSize { get; set; }
    public required Uri LogsUrl { get; set; }
}
