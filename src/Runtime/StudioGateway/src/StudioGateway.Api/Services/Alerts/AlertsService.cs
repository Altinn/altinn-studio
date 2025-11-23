using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.TypedHttpClients.AlertsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

namespace StudioGateway.Api.Services.Alerts;

public class AlertsService(
    IServiceProvider serviceProvider,
    IOptions<AlertsClientSettings> alertsClientSettings,
    IStudioClient studioClient
) : IAlertsService
{
    private readonly AlertsClientSettings _alertsClientSettings = alertsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default)
    {
        IAlertsClient client = serviceProvider.GetRequiredKeyedService<IAlertsClient>(_alertsClientSettings.Provider);

        IEnumerable<Alert> alerts = await client.GetFiringAlertsAsync(cancellationToken);

        return alerts;
    }

    /// <inheritdoc />
    public async Task UpsertFiringAlertsAsync(string org, string env, CancellationToken cancellationToken)
    {
        await studioClient.UpsertFiringAlertsAsync(org, env, cancellationToken);
    }
}
