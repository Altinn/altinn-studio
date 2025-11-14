using Microsoft.Extensions.Options;
using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.Providers.Alerts;
using StudioGateway.Api.TypedHttpClients.Studio;

namespace StudioGateway.Api.Services.Alerts;

public class AlertsService(
    IServiceProvider serviceProvider,
    IStudioClient studioClient
) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default)
    {
        IAlertsProvider provider = serviceProvider.GetRequiredKeyedService<IAlertsProvider>("Grafana");

        IEnumerable<Alert> alerts = await provider.GetFiringAlertsAsync(cancellationToken);

        return alerts;
    }

    /// <inheritdoc />
    public async Task UpsertFiringAlertsAsync(string org, string env, CancellationToken cancellationToken)
    {
        await studioClient.UpsertFiringAlertsAsync(org, env, cancellationToken);
    }
}
