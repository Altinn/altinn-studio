using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class ReportMetrics
{
    public IReadOnlyList<ReportApp> Apps { get; set; } = [];
    public IEnumerable<Metric> Metrics { get; set; } = [];
    public IEnumerable<AllAppsErrorMetric> ErrorMetrics { get; set; } = [];
}
