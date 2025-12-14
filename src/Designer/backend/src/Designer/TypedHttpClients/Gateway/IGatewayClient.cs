using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.TypedHttpClients.Gateway;

public interface IGatewayClient
{
    public Task<IEnumerable<StudioGatewayAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        int range,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        string env,
        string app,
        int range,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    );
}
