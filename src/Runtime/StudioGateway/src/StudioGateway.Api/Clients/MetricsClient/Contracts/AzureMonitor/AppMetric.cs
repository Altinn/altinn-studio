using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class AppMetric
{
    public required string Name { get; set; }
    public required IEnumerable<DataPoint> DataPoints { get; set; }
}
