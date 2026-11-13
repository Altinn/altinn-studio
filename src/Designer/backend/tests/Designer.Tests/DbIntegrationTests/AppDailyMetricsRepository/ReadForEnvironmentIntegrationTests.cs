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

public class ReadForEnvironmentIntegrationTests : DbIntegrationTestsBase
{
    private static readonly DateOnly s_day1 = new(2026, 11, 8);
    private static readonly DateOnly s_day2 = new(2026, 11, 9);
    private static readonly DateOnly s_day3 = new(2026, 11, 10);
    private static readonly DateTimeOffset s_computedAt = new(2026, 11, 11, 2, 30, 0, TimeSpan.Zero);

    // Each test gets its own environment name, since the environment is the only filter of these queries.
    private readonly string _environment = TestDataHelper.GenerateTestRepoName();

    public ReadForEnvironmentIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetCoverageByOrgAsync_ShouldReturnCoveragePerOrgInTheEnvironment()
    {
        var repository = CreateRepository();
        await Store(repository, "ttd", s_day1, Observation("kpi-a", created: 1));
        await Store(repository, "ttd", s_day3, Observation("kpi-a", created: 1));
        await Store(repository, "skd", s_day2, Observation("mva", completed: 2));
        await Store(repository, "nav", s_day2, [Observation("dp", completed: 3)], environment: "elsewhere");

        var coverage = await repository.GetCoverageByOrgAsync(_environment);

        Assert.Equal(["skd", "ttd"], coverage.Keys.Order());
        Assert.Equal(s_day1, coverage["ttd"].ObservedSince);
        Assert.Equal(s_day3, coverage["ttd"].LatestMetricDate);
        Assert.Equal(s_computedAt, coverage["ttd"].LatestComputedAt);
        Assert.Equal(s_day2, coverage["skd"].LatestMetricDate);
    }

    [Fact]
    public async Task GetCoverageByOrgAsync_WithoutRows_ShouldReturnEmpty()
    {
        Assert.Empty(await CreateRepository().GetCoverageByOrgAsync(_environment));
    }

    [Fact]
    public async Task GetRowsForEnvironmentAsync_ShouldReturnEveryOrgsRowsInRange()
    {
        var repository = CreateRepository();
        await Store(repository, "ttd", s_day1, Observation("kpi-a", created: 1));
        await Store(repository, "ttd", s_day2, Observation("kpi-a", created: 2));
        await Store(repository, "skd", s_day2, Observation("mva", created: 3));
        await Store(repository, "skd", s_day3, Observation("mva", created: 4));
        await Store(repository, "nav", s_day2, [Observation("dp", created: 5)], environment: "elsewhere");

        var rows = await repository.GetRowsForEnvironmentAsync(_environment, s_day2, s_day3);

        Assert.Equal(
            [("skd", s_day2, "mva"), ("skd", s_day3, "mva"), ("ttd", s_day2, "kpi-a")],
            rows.Select(r => (r.Org, r.MetricDate, r.App))
        );
    }

    [Fact]
    public async Task GetLastInstanceCreatedOnForEnvironmentAsync_ShouldReturnLastDayPerOrgAndApp()
    {
        var repository = CreateRepository();
        await Store(repository, "ttd", s_day1, Observation("kpi-a", created: 1), Observation("kpi-b", created: 1));
        await Store(repository, "ttd", s_day2, Observation("kpi-a", created: 1));
        await Store(repository, "skd", s_day3, Observation("mva", completed: 1));
        await Store(repository, "skd", s_day1, Observation("mva", created: 1));

        var lastCreatedOn = await repository.GetLastInstanceCreatedOnForEnvironmentAsync(_environment);

        Assert.Equal(
            new Dictionary<(string, string), DateOnly>
            {
                [("ttd", "kpi-a")] = s_day2,
                [("ttd", "kpi-b")] = s_day1,
                [("skd", "mva")] = s_day1,
            },
            lastCreatedOn
        );
    }

    private AppDailyMetricsRepositoryImplementation CreateRepository() => new(DbFixture.DbContext);

    private Task Store(
        AppDailyMetricsRepositoryImplementation repository,
        string org,
        DateOnly day,
        params AppDailyMetricsObservation[] observations
    )
    {
        return Store(repository, org, day, observations, _environment);
    }

    private static Task Store(
        AppDailyMetricsRepositoryImplementation repository,
        string org,
        DateOnly day,
        AppDailyMetricsObservation[] observations,
        string environment
    )
    {
        return repository.UpsertDayAsync(
            new AppDailyMetricsBatch
            {
                Org = org,
                Environment = environment,
                MetricDate = day,
                ComputedAt = s_computedAt,
                Observations = observations,
            }
        );
    }

    private static AppDailyMetricsObservation Observation(string app, int created = 0, int completed = 0)
    {
        return new AppDailyMetricsObservation
        {
            App = app,
            InstancesCreated = created,
            InstancesCompleted = completed,
        };
    }
}
