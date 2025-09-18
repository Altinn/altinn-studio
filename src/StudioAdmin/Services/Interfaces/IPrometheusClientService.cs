using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Providers.Interfaces;

public interface IPrometheusClientService
{
    Task<IEnumerable<AppMetric>> GetSeriesAsync(
        string promQl,
        int time,
        string app,
        string name,
        Func<IEnumerable<MetricDataPoint>, double> countFn,
        Func<double, bool> isError,
        string step,
        CancellationToken cancellationToken = default);
}
