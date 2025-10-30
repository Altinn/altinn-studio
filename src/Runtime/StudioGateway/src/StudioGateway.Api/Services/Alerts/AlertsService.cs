using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using StudioGateway.Api.Models;
using StudioGateway.Api.Providers.Alerts;

namespace StudioGateway.Api.Services.Alerts;

public class AlertsService(
    IServiceProvider serviceProvider
    ) : IAlertsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    )
    {
        IAlertsProvider service = serviceProvider.GetRequiredKeyedService<IAlertsProvider>("Grafana");

        IEnumerable<Alert> alerts = await service.GetFiringAlertsAsync(org, env, cancellationToken);

        return alerts;
    }
}
