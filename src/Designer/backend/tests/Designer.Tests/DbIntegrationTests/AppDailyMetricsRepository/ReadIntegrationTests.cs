using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;
using AppDailyMetricsRepositoryImplementation = Altinn.Studio.Designer.Repository.ORMImplementation.AppDailyMetricsRepository;

namespace Designer.Tests.DbIntegrationTests.AppDailyMetricsRepository;

public class ReadIntegrationTests : DbIntegrationTestsBase
{
    private const string Environment = "tt02";
    private static readonly DateOnly s_day1 = new(2026, 11, 8);
    private static readonly DateOnly s_day2 = new(2026, 11, 9);
    private static readonly DateOnly s_day3 = new(2026, 11, 10);
    private static readonly DateTimeOffset s_computedAt = new(2026, 11, 11, 2, 30, 0, TimeSpan.Zero);

    private readonly string _org = TestDataHelper.GenerateTestRepoName();

    public ReadIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetCoverageAsync_WithoutRows_ShouldReturnNull()
    {
        Assert.Null(await CreateRepository().GetCoverageAsync(_org, Environment));
    }

    [Fact]
    public async Task GetCoverageAsync_ShouldReturnFirstDayLatestDayAndLatestComputedAt()
    {
        var repository = CreateRepository();
        await Store(repository, s_day1, s_computedAt.AddDays(-2), Observation("kpi-a", created: 1));
        await Store(repository, s_day2, s_computedAt.AddDays(-1), Observation("kpi-a", created: 1));
        await Store(repository, s_day3, s_computedAt, Observation("kpi-a", created: 1));
        await Store(
            repository,
            s_day3,
            s_computedAt.AddDays(5),
            [Observation("kpi-a", created: 9)],
            environment: "production"
        );

        var coverage = await repository.GetCoverageAsync(_org, Environment);

        Assert.NotNull(coverage);
        Assert.Equal(s_day1, coverage.ObservedSince);
        Assert.Equal(s_day3, coverage.LatestMetricDate);
        Assert.Equal(s_computedAt, coverage.LatestComputedAt);
    }

    [Fact]
    public async Task GetRowsAsync_ShouldReturnRowsInRangeOrderedByDayAndApp()
    {
        var repository = CreateRepository();
        await Store(repository, s_day1, s_computedAt, Observation("kpi-a", created: 1));
        await Store(
            repository,
            s_day2,
            s_computedAt,
            Observation("kpi-b", created: 2, completed: 1, p50: 60),
            Observation("kpi-a", created: 3)
        );
        await Store(repository, s_day3, s_computedAt, Observation("kpi-a", created: 4));
        await Store(repository, s_day2, s_computedAt, [Observation("kpi-a", created: 99)], environment: "production");

        var rows = await repository.GetRowsAsync(_org, Environment, s_day1, s_day2);

        Assert.Equal(
            [(s_day1, "kpi-a"), (s_day2, "kpi-a"), (s_day2, "kpi-b")],
            rows.Select(r => (r.MetricDate, r.App))
        );
        var appB = rows[2];
        Assert.Equal(2, appB.InstancesCreated);
        Assert.Equal(1, appB.InstancesCompleted);
        Assert.Equal(60, appB.SecondsToCompleteP50);
        Assert.Equal(s_computedAt, appB.ComputedAt);
    }

    [Fact]
    public async Task GetLastInstanceCreatedOnAsync_ShouldReturnLastDayWithCreatedInstancesPerApp()
    {
        var repository = CreateRepository();
        await Store(
            repository,
            s_day1,
            s_computedAt,
            Observation("kpi-a", created: 1),
            Observation("kpi-b", created: 1)
        );
        await Store(
            repository,
            s_day2,
            s_computedAt,
            Observation("kpi-a", created: 1),
            Observation("kpi-b", completed: 1)
        );
        await Store(
            repository,
            s_day3,
            s_computedAt,
            Observation("kpi-a", completed: 1),
            Observation("kpi-c", completed: 1)
        );

        var lastCreatedOn = await repository.GetLastInstanceCreatedOnAsync(_org, Environment);

        Assert.Equal(new Dictionary<string, DateOnly> { ["kpi-a"] = s_day2, ["kpi-b"] = s_day1 }, lastCreatedOn);
    }

    private AppDailyMetricsRepositoryImplementation CreateRepository() => new(DbFixture.DbContext);

    private Task Store(
        AppDailyMetricsRepositoryImplementation repository,
        DateOnly day,
        DateTimeOffset computedAt,
        params AppDailyMetricsObservation[] observations
    )
    {
        return Store(repository, day, computedAt, observations, Environment);
    }

    private Task Store(
        AppDailyMetricsRepositoryImplementation repository,
        DateOnly day,
        DateTimeOffset computedAt,
        AppDailyMetricsObservation[] observations,
        string environment
    )
    {
        return repository.UpsertDayAsync(
            new AppDailyMetricsBatch
            {
                Org = _org,
                Environment = environment,
                MetricDate = day,
                ComputedAt = computedAt,
                Observations = observations,
            }
        );
    }

    private static AppDailyMetricsObservation Observation(
        string app,
        int created = 0,
        int completed = 0,
        int? p50 = null
    )
    {
        return new AppDailyMetricsObservation
        {
            App = app,
            InstancesCreated = created,
            InstancesCompleted = completed,
            SecondsToCompleteP50 = p50,
        };
    }
}
