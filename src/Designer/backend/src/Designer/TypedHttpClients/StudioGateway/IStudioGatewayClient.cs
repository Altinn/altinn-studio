using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.TypedHttpClient.StudioGateway;

public interface IStudioGatewayClient
{
    public Task<IEnumerable<StudioGatewayAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );

    public Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken = default
    );

    public Task<IEnumerable<HealthMetric>> GetHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken = default
    );
}
