using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.Gateway;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class MetricsService(
    IGatewayClient gatewayClient
    ) : IMetricsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        return await gatewayClient.GetMetricsAsync(org, env, app, time, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<HealthMetric>> GetHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        return await gatewayClient.GetHealthMetricsAsync(org, env, app, cancellationToken);
    }
}
