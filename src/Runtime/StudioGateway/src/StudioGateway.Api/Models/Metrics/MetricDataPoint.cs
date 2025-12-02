using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Models.Metrics;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class MetricDataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public double Count { get; set; }
}
