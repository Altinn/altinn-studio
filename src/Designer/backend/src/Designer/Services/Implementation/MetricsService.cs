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
        int time,
        CancellationToken cancellationToken
    )
    {
        return await gatewayClient.GetMetricsAsync(org, env, time, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        return await gatewayClient.GetAppMetricsAsync(org, env, app, time, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        return await gatewayClient.GetAppHealthMetricsAsync(org, env, app, cancellationToken);
    }
}
