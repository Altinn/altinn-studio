using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Services.Implementation;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class PlatformMetricsServiceTests
{
    private const string Env = "production";
    private static readonly DateOnly s_latest = new(2026, 11, 10);
    private static readonly DateTimeOffset s_computedAt = new(2026, 11, 11, 2, 30, 0, TimeSpan.Zero);

    private readonly Mock<IAppDailyMetricsRepository> _repository = new();
    private readonly Dictionary<string, AppDailyMetricsCoverage> _coverage = new(StringComparer.Ordinal);
    private readonly List<AppDailyMetricsRecord> _rows = [];
    private readonly Dictionary<(string Org, string App), DateOnly> _lastCreatedOn = [];

    public PlatformMetricsServiceTests()
    {
        _repository.Setup(r => r.GetCoverageByOrgAsync(Env, It.IsAny<CancellationToken>())).ReturnsAsync(_coverage);
        _repository
            .Setup(r =>
                r.GetRowsForEnvironmentAsync(
                    Env,
                    It.IsAny<DateOnly>(),
                    It.IsAny<DateOnly>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (string _, DateOnly from, DateOnly to, CancellationToken _) =>
                    _rows.Where(row => row.MetricDate >= from && row.MetricDate <= to).ToList()
            );
        _repository
            .Setup(r => r.GetLastInstanceCreatedOnForEnvironmentAsync(Env, It.IsAny<CancellationToken>()))
            .ReturnsAsync(_lastCreatedOn);
    }

    [Fact]
    public async Task GetAppDailyMetricsAsync_WithoutStoredMetrics_ShouldReturnNoServiceOwners()
    {
        var metrics = await CreateService().GetAppDailyMetricsAsync(Env, 30);

        Assert.Equal(Env, metrics.Environment);
        Assert.Null(metrics.MetricDate);
        Assert.Empty(metrics.ServiceOwners);
    }

    [Fact]
    public async Task GetAppDailyMetricsAsync_ShouldUseOnePeriodForAll()
    {
        // skd's collection failed last night: its latest day is one day old.
        _coverage["ttd"] = Coverage(s_latest);
        _coverage["skd"] = Coverage(s_latest.AddDays(-1));
        AddRow(s_latest, "ttd", "kpi-a", created: 2);
        AddRow(s_latest.AddDays(-1), "ttd", "kpi-a", created: 1);
        AddRow(s_latest.AddDays(-1), "skd", "mva", created: 3);
        AddRow(s_latest.AddDays(-9), "skd", "mva", created: 10);
        _lastCreatedOn[("ttd", "kpi-a")] = s_latest;
        _lastCreatedOn[("skd", "mva")] = s_latest.AddDays(-1);

        var metrics = await CreateService().GetAppDailyMetricsAsync(Env, 7);

        Assert.Equal(s_latest, metrics.MetricDate);
        Assert.Equal(["skd", "ttd"], metrics.ServiceOwners.Select(o => o.Org));
        var skd = metrics.ServiceOwners[0];
        Assert.Equal(s_latest.AddDays(-1), skd.LatestMetricDate);
        Assert.Equal(s_computedAt, skd.ComputedAt);
        var mva = Assert.Single(skd.Apps);
        Assert.Equal(3, mva.InstancesCreated);
        Assert.Equal(10, mva.InstancesCreatedPreviousPeriod);
        var ttd = metrics.ServiceOwners[1];
        var kpiA = Assert.Single(ttd.Apps);
        Assert.Equal(3, kpiA.InstancesCreated);
        // Rows are read once, from the previous period's start to the platform's last day.
        _repository.Verify(
            r => r.GetRowsForEnvironmentAsync(Env, s_latest.AddDays(-13), s_latest, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task GetAppDailyMetricsAsync_ShouldListAppsOfAnOwnerWithoutRowsInTheWindow()
    {
        _coverage["ttd"] = Coverage(s_latest);
        _lastCreatedOn[("ttd", "old-app")] = new DateOnly(2026, 4, 1);
        _lastCreatedOn[("skd", "other")] = new DateOnly(2026, 4, 1);
        _coverage["skd"] = Coverage(s_latest);

        var metrics = await CreateService().GetAppDailyMetricsAsync(Env, 30);

        var ttd = metrics.ServiceOwners.Single(o => o.Org == "ttd");
        var oldApp = Assert.Single(ttd.Apps);
        Assert.Equal("old-app", oldApp.App);
        Assert.Equal(new DateOnly(2026, 4, 1), oldApp.LastInstanceCreatedOn);
        var skd = metrics.ServiceOwners.Single(o => o.Org == "skd");
        Assert.Equal("other", Assert.Single(skd.Apps).App);
    }

    [Fact]
    public async Task GetAppDailyMetricsAsync_WithInvalidPeriod_ShouldThrow()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => CreateService().GetAppDailyMetricsAsync(Env, 0));
    }

    private PlatformMetricsService CreateService() => new(_repository.Object);

    private static AppDailyMetricsCoverage Coverage(DateOnly latest)
    {
        return new AppDailyMetricsCoverage
        {
            ObservedSince = new DateOnly(2026, 10, 1),
            LatestMetricDate = latest,
            LatestComputedAt = s_computedAt,
        };
    }

    private void AddRow(DateOnly date, string org, string app, int created = 0)
    {
        _rows.Add(
            new AppDailyMetricsRecord
            {
                MetricDate = date,
                Org = org,
                App = app,
                InstancesCreated = created,
                InstancesCompleted = 0,
                ComputedAt = s_computedAt,
            }
        );
    }
}
