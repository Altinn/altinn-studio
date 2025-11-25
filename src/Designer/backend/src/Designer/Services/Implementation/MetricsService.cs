using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClient.StudioGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

public class MetricsService(
    IStudioGatewayClient studioGatewayClient
    ) : IMetricsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetMetricsAsync(
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
    public async Task<IEnumerable<AppMetric>> GetFailedProcessNextRequestsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    )
    {
        return await studioGatewayClient.GetFailedProcessNextRequestsAsync(org, env, app, time, cancellationToken);
    }
}
