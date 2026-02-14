using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class MetricsService(
    IRuntimeGatewayClient runtimeGatewayClient
    ) : IMetricsService
{
    /// <inheritdoc />
    public async Task<IEnumerable<ErrorMetric>> GetErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int range,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetErrorMetricsAsync(org, environment, range, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetAppMetricsAsync(org, environment, app, range, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppErrorMetric>> GetAppErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetAppErrorMetricsAsync(org, environment, app, range, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        CancellationToken cancellationToken
    )
    {
        return await runtimeGatewayClient.GetAppHealthMetricsAsync(org, environment, app, cancellationToken);
    }
}
