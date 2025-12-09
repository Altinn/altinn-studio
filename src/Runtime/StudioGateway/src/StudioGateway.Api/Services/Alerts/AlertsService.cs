using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.TypedHttpClients.AlertsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

namespace StudioGateway.Api.Services.Alerts;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class AlertsService(
    IServiceProvider serviceProvider,
    IOptions<AlertsClientSettings> alertsClientSettings,
    IStudioClient studioClient
) : IAlertsService
{
    private readonly AlertsClientSettings _alertsClientSettings = alertsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(CancellationToken cancellationToken)
    {
        IAlertsClient client = serviceProvider.GetRequiredKeyedService<IAlertsClient>(_alertsClientSettings.Provider);

        IEnumerable<AlertRule> alertRules = await client.GetAlertRulesAsync(cancellationToken);

        return alertRules;
    }

    /// <inheritdoc />
    public async Task NotifyAlertsUpdatedAsync(CancellationToken cancellationToken)
    {
        await studioClient.NotifyAlertsUpdatedAsync(cancellationToken);
    }
}
