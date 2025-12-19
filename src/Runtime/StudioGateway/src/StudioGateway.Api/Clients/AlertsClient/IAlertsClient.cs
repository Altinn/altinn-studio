using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Clients.AlertsClient.Contracts;

namespace StudioGateway.Api.Clients.AlertsClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IAlertsClient
{
    public Task<IEnumerable<GrafanaAlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken);
}
