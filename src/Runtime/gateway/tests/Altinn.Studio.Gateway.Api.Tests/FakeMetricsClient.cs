using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

namespace Altinn.Studio.Gateway.Api.Tests;

internal sealed class FakeMetricsClient(
    ActiveAppsResult? activeAppsResult = null,
    AppActivitySignalsResult? appActivitySignalsResult = null
) : IMetricsClient
{
    public List<int> RequestedWindowDays { get; } = [];

    public Task<IEnumerable<FailedRequest>> GetFailedRequests(int range, CancellationToken cancellationToken) =>
        throw new NotSupportedException();

    public Task<ActiveAppsResult> GetActiveApps(int windowDays, CancellationToken cancellationToken)
    {
        RequestedWindowDays.Add(windowDays);
        return Task.FromResult(activeAppsResult ?? throw new NotSupportedException());
    }

    public Task<AppActivitySignalsResult> GetAppActivitySignals(int windowDays, CancellationToken cancellationToken)
    {
        RequestedWindowDays.Add(windowDays);
        return Task.FromResult(appActivitySignalsResult ?? throw new NotSupportedException());
    }

    public Task<IEnumerable<AppFailedRequest>> GetAppFailedRequests(
        string app,
        int range,
        CancellationToken cancellationToken
    ) => throw new NotSupportedException();

    public Task<IEnumerable<Metric>> GetMetrics(int range, CancellationToken cancellationToken) =>
        throw new NotSupportedException();

    public Task<IEnumerable<AllAppsFailedRequest>> GetAllAppsFailedRequests(
        int range,
        CancellationToken cancellationToken
    ) => throw new NotSupportedException();

    public Task<IEnumerable<AppMetric>> GetAppMetrics(string app, int range, CancellationToken cancellationToken) =>
        throw new NotSupportedException();

    public Uri GetLogsUrl(
        string subscriptionId,
        string org,
        string env,
        IReadOnlyCollection<string> apps,
        string metricName,
        DateTimeOffset from,
        DateTimeOffset to
    ) => throw new NotSupportedException();
}
