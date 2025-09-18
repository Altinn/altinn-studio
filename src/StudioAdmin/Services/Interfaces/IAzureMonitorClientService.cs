using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

public interface IAzureMonitorClientService
{
    public Task<IEnumerable<AppMetric>> GetMetrics(string org, string env, IEnumerable<string> names, int time, int take, string? app, CancellationToken cancellationToken);

    public Task<IEnumerable<AppMetric>> GetFailedRequests(string org, string env, int time, int take, string? app, CancellationToken cancellationToken);
}
