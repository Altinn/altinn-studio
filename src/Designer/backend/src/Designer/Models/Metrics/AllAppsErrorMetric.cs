using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class AllAppsErrorMetric
{
    public required string AppName { get; set; }
    public required string Name { get; set; }
    public required IEnumerable<long> Timestamps { get; set; }
    public required IEnumerable<double> Counts { get; set; }

    /// <summary>
    /// The count for the whole time range, which is not the sum of <see cref="Counts"/> when the metric counts
    /// instances. A gateway that predates it sends none.
    /// </summary>
    public double? Count { get; set; }

    public required int BucketSize { get; set; }
    public required Uri LogsUrl { get; set; }
}
