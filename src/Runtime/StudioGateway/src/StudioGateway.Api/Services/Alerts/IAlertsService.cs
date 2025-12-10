using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Alerts;

namespace StudioGateway.Api.Services.Alerts;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IAlertsService
{
    public Task<IEnumerable<AlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken);

    public Task NotifyAlertsUpdatedAsync(CancellationToken cancellationToken);
}
