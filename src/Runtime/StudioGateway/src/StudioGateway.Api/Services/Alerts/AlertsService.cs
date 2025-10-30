using StudioGateway.Api.Models.Alerts;
using StudioGateway.Api.Providers.Alerts;

namespace StudioGateway.Api.Services.Alerts;

public class AlertsService(
    IServiceProvider serviceProvider
    ) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(CancellationToken cancellationToken = default)
    {
        IAlertsProvider provider = serviceProvider.GetRequiredKeyedService<IAlertsProvider>("Grafana");

        IEnumerable<Alert> alerts = await provider.GetFiringAlertsAsync(cancellationToken);

        return alerts;
    }
}
