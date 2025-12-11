using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IMetricsService
{
    public Task<IEnumerable<Metric>> GetMetricsAsync(
        string org,
        string env,
        int time,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken
    );

    public Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        string env,
        string app,
        CancellationToken cancellationToken
    );
}
