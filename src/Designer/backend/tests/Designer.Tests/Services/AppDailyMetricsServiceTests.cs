using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Services.Implementation;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppDailyMetricsServiceTests
{
    private const string Org = "ttd";
    private const string Env = "tt02";
    private static readonly DateOnly s_latest = new(2026, 11, 10);
    private static readonly DateTimeOffset s_computedAt = new(2026, 11, 11, 2, 30, 0, TimeSpan.Zero);

    private readonly Mock<IAppDailyMetricsRepository> _repository = new();
    private readonly List<AppDailyMetricsRecord> _rows = [];
    private readonly Dictionary<string, DateOnly> _lastCreatedOn = new(StringComparer.Ordinal);

    public AppDailyMetricsServiceTests()
    {
        _repository
            .Setup(r =>
                r.GetRowsAsync(Org, Env, It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (string _, string _, DateOnly from, DateOnly to, CancellationToken _) =>
                    _rows.Where(row => row.MetricDate >= from && row.MetricDate <= to).ToList()
            );
        _repository
            .Setup(r => r.GetLastInstanceCreatedOnAsync(Org, Env, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_lastCreatedOn);
    }

    [Fact]
    public async Task GetSummaryAsync_WithoutStoredMetrics_ShouldReturnEmptySummary()
    {
        SetupCoverage(null);

        var summary = await CreateService().GetSummaryAsync(Org, Env, 30);

        Assert.Equal(30, summary.PeriodDays);
        Assert.Null(summary.MetricDate);
        Assert.Empty(summary.Apps);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldSumPeriodAndPreviousPeriodEndingOnLatestDay()
    {
        SetupCoverage(Coverage(new DateOnly(2026, 10, 1)));
        // Period of 7 days: 4 to 10 November. Previous period: 28 October to 3 November.
        AddRow(new DateOnly(2026, 11, 10), "kpi-a", created: 5, completed: 2);
        AddRow(new DateOnly(2026, 11, 4), "kpi-a", created: 1, completed: 1);
        AddRow(new DateOnly(2026, 11, 3), "kpi-a", created: 10, completed: 0);
        AddRow(new DateOnly(2026, 10, 28), "kpi-a", created: 20, completed: 0);
        AddRow(new DateOnly(2026, 10, 27), "kpi-a", created: 100, completed: 0);
        _lastCreatedOn["kpi-a"] = new DateOnly(2026, 11, 10);

        var summary = await CreateService().GetSummaryAsync(Org, Env, 7);

        Assert.Equal(s_latest, summary.MetricDate);
        Assert.Equal(new DateOnly(2026, 10, 1), summary.ObservedSince);
        var app = Assert.Single(summary.Apps);
        Assert.Equal(6, app.InstancesCreated);
        Assert.Equal(30, app.InstancesCreatedPreviousPeriod);
        Assert.Equal(3, app.InstancesCompleted);
        Assert.Equal(new DateOnly(2026, 11, 10), app.LastInstanceCreatedOn);
        _repository.Verify(
            r => r.GetRowsAsync(Org, Env, new DateOnly(2026, 10, 28), s_latest, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldWeightDailyMediansByInstancesCompleted()
    {
        SetupCoverage(Coverage());
        // 1 instance at 1000 s, 10 at 100 s, 1 at 10 s: the weighted median is 100 s.
        AddRow(new DateOnly(2026, 11, 10), "kpi-a", completed: 1, p50: 1000);
        AddRow(new DateOnly(2026, 11, 9), "kpi-a", completed: 10, p50: 100);
        AddRow(new DateOnly(2026, 11, 8), "kpi-a", completed: 1, p50: 10);
        // Days without completed instances do not count.
        AddRow(new DateOnly(2026, 11, 7), "kpi-a", completed: 0, p50: null);
        AddRow(new DateOnly(2026, 11, 10), "kpi-b", completed: 0, p50: null);

        var summary = await CreateService().GetSummaryAsync(Org, Env, 30);

        Assert.Equal(100, summary.Apps.Single(a => a.App == "kpi-a").SecondsToCompleteP50);
        Assert.Null(summary.Apps.Single(a => a.App == "kpi-b").SecondsToCompleteP50);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldListAppsWithoutRowsInTheWindowButWithEarlierInstances()
    {
        SetupCoverage(Coverage());
        AddRow(s_latest, "kpi-b", created: 1);
        _lastCreatedOn["kpi-a"] = new DateOnly(2026, 5, 1);
        _lastCreatedOn["kpi-b"] = s_latest;

        var summary = await CreateService().GetSummaryAsync(Org, Env, 30);

        Assert.Equal(["kpi-a", "kpi-b"], summary.Apps.Select(a => a.App));
        var idle = summary.Apps[0];
        Assert.Equal(0, idle.InstancesCreated);
        Assert.Equal(new DateOnly(2026, 5, 1), idle.LastInstanceCreatedOn);
    }

    [Fact]
    public async Task GetAppDetailsAsync_ShouldReturnTheApp()
    {
        SetupCoverage(Coverage());
        AddRow(s_latest, "kpi-a", created: 3, completed: 2, p50: 600);
        AddRow(s_latest, "kpi-b", created: 9);

        var details = await CreateService().GetAppDetailsAsync(Org, Env, "kpi-a", 30);

        Assert.Equal(s_latest, details.MetricDate);
        Assert.Equal(s_computedAt, details.ComputedAt);
        Assert.Equal("kpi-a", details.Metrics.App);
        Assert.Equal(3, details.Metrics.InstancesCreated);
        Assert.Equal(600, details.Metrics.SecondsToCompleteP50);
    }

    [Fact]
    public async Task GetAppDetailsAsync_WithoutStoredMetrics_ShouldReturnZerosAndNoTasks()
    {
        SetupCoverage(null);

        var details = await CreateService().GetAppDetailsAsync(Org, Env, "kpi-a", 30);

        Assert.Null(details.MetricDate);
        Assert.Equal("kpi-a", details.Metrics.App);
        Assert.Equal(0, details.Metrics.InstancesCreated);
        Assert.Null(details.Metrics.LastInstanceCreatedOn);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-7)]
    public async Task GetSummaryAsync_WithInvalidPeriod_ShouldThrow(int periodDays)
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            CreateService().GetSummaryAsync(Org, Env, periodDays)
        );
    }

    private AppDailyMetricsService CreateService() => new(_repository.Object);

    private void SetupCoverage(AppDailyMetricsCoverage coverage)
    {
        _repository.Setup(r => r.GetCoverageAsync(Org, Env, It.IsAny<CancellationToken>())).ReturnsAsync(coverage);
    }

    private static AppDailyMetricsCoverage Coverage(DateOnly? observedSince = null)
    {
        return new AppDailyMetricsCoverage
        {
            ObservedSince = observedSince ?? new DateOnly(2026, 10, 1),
            LatestMetricDate = s_latest,
            LatestComputedAt = s_computedAt,
        };
    }

    private void AddRow(DateOnly date, string app, int created = 0, int completed = 0, int? p50 = null)
    {
        _rows.Add(
            new AppDailyMetricsRecord
            {
                MetricDate = date,
                Org = Org,
                App = app,
                InstancesCreated = created,
                InstancesCompleted = completed,
                SecondsToCompleteP50 = p50,
                ComputedAt = s_computedAt,
            }
        );
    }
}
