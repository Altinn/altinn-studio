using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Interfaces;
using static Altinn.Studio.Designer.Services.Implementation.AppDailyMetricsAggregation;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppDailyMetricsService : IAppDailyMetricsService
{
    private readonly IAppDailyMetricsRepository _repository;

    public AppDailyMetricsService(IAppDailyMetricsRepository repository)
    {
        _repository = repository;
    }

    public async Task<AppDailyMetricsSummary> GetSummaryAsync(
        string org,
        string environment,
        int periodDays,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(periodDays);

        var coverage = await _repository.GetCoverageAsync(org, environment, cancellationToken);
        if (coverage is null)
        {
            return new AppDailyMetricsSummary { PeriodDays = periodDays, Apps = [] };
        }

        var window = Window.Of(coverage.LatestMetricDate, periodDays);
        var rows = await _repository.GetRowsAsync(org, environment, window.From, window.To, cancellationToken);
        var lastCreatedOn = await _repository.GetLastInstanceCreatedOnAsync(org, environment, cancellationToken);
        var rowsByApp = rows.ToLookup(row => row.App, StringComparer.Ordinal);

        var apps = rowsByApp
            .Select(group => group.Key)
            .Concat(lastCreatedOn.Keys)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .Select(app => Summarize(app, rowsByApp[app].ToList(), LastCreatedOn(lastCreatedOn, app), window))
            .ToList();

        return new AppDailyMetricsSummary
        {
            PeriodDays = periodDays,
            MetricDate = coverage.LatestMetricDate,
            ObservedSince = coverage.ObservedSince,
            ComputedAt = coverage.LatestComputedAt,
            Apps = apps,
        };
    }

    public async Task<AppDailyMetricsDetails> GetAppDetailsAsync(
        string org,
        string environment,
        string app,
        int periodDays,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(periodDays);

        var coverage = await _repository.GetCoverageAsync(org, environment, cancellationToken);
        if (coverage is null)
        {
            return new AppDailyMetricsDetails { PeriodDays = periodDays, Metrics = Summarize(app, [], null, null) };
        }

        var window = Window.Of(coverage.LatestMetricDate, periodDays);
        var rows = (await _repository.GetRowsAsync(org, environment, window.From, window.To, cancellationToken))
            .Where(row => row.App == app)
            .ToList();
        var lastCreatedOn = await _repository.GetLastInstanceCreatedOnAsync(org, environment, cancellationToken);

        return new AppDailyMetricsDetails
        {
            PeriodDays = periodDays,
            MetricDate = coverage.LatestMetricDate,
            ObservedSince = coverage.ObservedSince,
            ComputedAt = coverage.LatestComputedAt,
            Metrics = Summarize(app, rows, LastCreatedOn(lastCreatedOn, app), window),
        };
    }

    private static DateOnly? LastCreatedOn(IReadOnlyDictionary<string, DateOnly> lastCreatedOn, string app) =>
        lastCreatedOn.TryGetValue(app, out var date) ? date : null;
}
