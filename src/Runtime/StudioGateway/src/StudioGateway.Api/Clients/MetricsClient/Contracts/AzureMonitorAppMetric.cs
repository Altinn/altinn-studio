using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Clients.MetricsClient.Contracts;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class AzureMonitorMetricApp
{
    public required string AppName { get; set; }
    public required double Count { get; set; }
}
