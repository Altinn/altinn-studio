using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IMetricsService
{
    public Task<IEnumerable<AppMetric>> GetMetricsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken = default
    );

    public Task<IEnumerable<AppMetric>> GetFailedProcessNextRequestsAsync(
        string org,
        string env,
        string app,
        int time,
        CancellationToken cancellationToken = default
    );
}
