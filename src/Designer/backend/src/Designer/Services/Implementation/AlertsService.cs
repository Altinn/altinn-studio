using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Services.Implementation;

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
        IAlertProvider service = serviceProvider.GetRequiredKeyedService<IAlertProvider>("Grafana");

        IEnumerable<Alert> alerts = await service.GetFiringAlertsAsync(org, env, cancellationToken);

        return alerts;
    }
}
