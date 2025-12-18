using System.Diagnostics.CodeAnalysis;

namespace StudioGateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class FailedRequest
{
    public required string Name { get; set; }
    public required string AppName { get; set; }
    public required double Count { get; set; }
}
