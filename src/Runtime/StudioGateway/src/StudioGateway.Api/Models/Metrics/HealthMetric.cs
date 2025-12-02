using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Models.Metrics;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class HealthMetric
{
    public required string Name { get; set; }
    public required double Value { get; set; }
}
