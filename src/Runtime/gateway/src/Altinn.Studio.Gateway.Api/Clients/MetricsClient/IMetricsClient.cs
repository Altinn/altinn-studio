using Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient;

internal interface IMetricsClient
{
    public Task<IEnumerable<FailedRequest>> GetFailedRequests(int range, CancellationToken cancellationToken);
    public Task<ActiveAppsResult> GetActiveApps(int windowDays, CancellationToken cancellationToken);
    public Task<AppActivitySignalsResult> GetAppActivitySignals(int windowDays, CancellationToken cancellationToken);
    public Task<IEnumerable<AppFailedRequest>> GetAppFailedRequests(
        string app,
        int range,
        CancellationToken cancellationToken
    );
    public Task<IEnumerable<Metric>> GetMetrics(
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    );
    public Task<IEnumerable<AppMetric>> GetAppMetrics(string app, int range, CancellationToken cancellationToken);
    public Task<IEnumerable<AllAppsFailedRequest>> GetAllAppsFailedRequests(
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    );
    public Uri GetLogsUrl(
        string subscriptionId,
        string org,
        string env,
        IReadOnlyCollection<string> apps,
        string metricName,
        DateTimeOffset from,
        DateTimeOffset to
    );
}
