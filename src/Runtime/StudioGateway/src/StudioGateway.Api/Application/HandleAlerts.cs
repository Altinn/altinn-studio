using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.Settings;
using StudioGateway.Api.TypedHttpClients.AlertsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

namespace StudioGateway.Api.Application;

internal static class HandleAlerts
{
    /// <inheritdoc />
    internal static async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        IServiceProvider serviceProvider,
        AlertsClientSettings alertsClientSettings,
        CancellationToken cancellationToken
    )
    {
        IAlertsClient client = serviceProvider.GetRequiredKeyedService<IAlertsClient>(alertsClientSettings.Provider);

        IEnumerable<AlertRule> alertRules = await client.GetAlertRulesAsync(cancellationToken);

        return alertRules;
    }

    /// <inheritdoc />
    internal static async Task NotifyAlertsUpdatedAsync(IStudioClient studioClient, CancellationToken cancellationToken)
    {
        await studioClient.NotifyAlertsUpdatedAsync(cancellationToken);
    }
}
