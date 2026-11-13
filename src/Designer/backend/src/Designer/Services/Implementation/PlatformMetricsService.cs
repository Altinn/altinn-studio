using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Interfaces;
using static Altinn.Studio.Designer.Services.Implementation.AppDailyMetricsAggregation;

namespace Altinn.Studio.Designer.Services.Implementation;

public class PlatformMetricsService : IPlatformMetricsService
{
    private readonly IAppDailyMetricsRepository _repository;

    public PlatformMetricsService(IAppDailyMetricsRepository repository)
    {
        _repository = repository;
    }

    public async Task<PlatformAppDailyMetrics> GetAppDailyMetricsAsync(
        string environment,
        int periodDays,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(periodDays);

        var coverageByOrg = await _repository.GetCoverageByOrgAsync(environment, cancellationToken);
        if (coverageByOrg.Count == 0)
        {
            return new PlatformAppDailyMetrics
            {
                Environment = environment,
                PeriodDays = periodDays,
                ServiceOwners = [],
            };
        }

        // One period for every service owner, ending on the platform's last stored day, so the service owners
        // are comparable even when one of them missed a night.
        var periodEnd = coverageByOrg.Values.Max(coverage => coverage.LatestMetricDate);
        var window = Window.Of(periodEnd, periodDays);
        var rows = await _repository.GetRowsForEnvironmentAsync(environment, window.From, periodEnd, cancellationToken);
        var lastCreatedOn = await _repository.GetLastInstanceCreatedOnForEnvironmentAsync(
            environment,
            cancellationToken
        );
        var rowsByOrgAndApp = rows.ToLookup(row => (row.Org, row.App));

        var serviceOwners = coverageByOrg
            .OrderBy(entry => entry.Key, StringComparer.Ordinal)
            .Select(entry =>
            {
                var org = entry.Key;
                var apps = rowsByOrgAndApp
                    .Select(group => group.Key)
                    .Concat(lastCreatedOn.Keys)
                    .Where(key => key.Org == org)
                    .Select(key => key.App)
                    .Distinct(StringComparer.Ordinal)
                    .Order(StringComparer.Ordinal)
                    .Select(app =>
                        Summarize(
                            app,
                            rowsByOrgAndApp[(org, app)].ToList(),
                            lastCreatedOn.TryGetValue((org, app), out var date) ? date : null,
                            window
                        )
                    )
                    .ToList();
                return new ServiceOwnerAppDailyMetrics
                {
                    Org = org,
                    ObservedSince = entry.Value.ObservedSince,
                    LatestMetricDate = entry.Value.LatestMetricDate,
                    ComputedAt = entry.Value.LatestComputedAt,
                    Apps = apps,
                };
            })
            .ToList();

        return new PlatformAppDailyMetrics
        {
            Environment = environment,
            PeriodDays = periodDays,
            MetricDate = periodEnd,
            ServiceOwners = serviceOwners,
        };
    }
}
