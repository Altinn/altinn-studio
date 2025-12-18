using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class MetricsService(
    IRuntimeGatewayClient runetimeGatewayClient
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
        return await runetimeGatewayClient.GetErrorMetricsAsync(org, environment, range, cancellationToken);
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
        return await runetimeGatewayClient.GetAppMetricsAsync(org, environment, app, range, cancellationToken);
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
        return await runetimeGatewayClient.GetAppErrorMetricsAsync(org, environment, app, range, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<string> GetAppErrorMetricsLogsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        string metric,
        int range,
        CancellationToken cancellationToken
    )
    {
        return await runetimeGatewayClient.GetAppErrorMetricsLogsAsync(org, environment, app, metric, range, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        CancellationToken cancellationToken
    )
    {
        return await runetimeGatewayClient.GetAppHealthMetricsAsync(org, environment, app, cancellationToken);
    }
}
