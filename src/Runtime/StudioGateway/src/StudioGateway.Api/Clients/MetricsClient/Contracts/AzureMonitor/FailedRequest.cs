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
    public required IEnumerable<string> OperationNames { get; set; }
    public required IEnumerable<FailedRequestApp> Apps { get; set; }
}
