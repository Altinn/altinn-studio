namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class ReportMetrics
{
    public required IReadOnlyList<string> Apps { get; set; }
    public required IEnumerable<Metric> Metrics { get; set; }
    public required IEnumerable<AllAppsErrorMetric> ErrorMetrics { get; set; }
}
