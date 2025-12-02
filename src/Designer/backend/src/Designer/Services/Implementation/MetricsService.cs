using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.StudioGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class MetricsService(
    IStudioGatewayClient studioGatewayClient
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
        return await studioGatewayClient.GetMetricsAsync(org, env, app, time, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<HealthMetric>> GetHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    )
    {
        return await studioGatewayClient.GetHealthMetricsAsync(org, env, app, cancellationToken);
    }
}
