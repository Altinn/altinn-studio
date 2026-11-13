#nullable disable

using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.EntityFrameworkCore;
using Xunit;
using AppDailyMetricsRepositoryImplementation = Altinn.Studio.Designer.Repository.ORMImplementation.AppDailyMetricsRepository;

namespace Designer.Tests.DbIntegrationTests.AppDailyMetricsRepository;

public class UpsertDayAsyncIntegrationTests : DbIntegrationTestsBase
{
    private const string Environment = "tt02";
    private static readonly DateOnly s_day = new(2026, 11, 10);
    private static readonly DateTimeOffset s_firstRun = new(2026, 11, 11, 2, 30, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset s_secondRun = s_firstRun.AddHours(1);

    private readonly string _org = TestDataHelper.GenerateTestRepoName();

    public UpsertDayAsyncIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task UpsertDayAsync_FirstRun_ShouldInsertOneRowPerApp()
    {
        var repository = CreateRepository();

        await repository.UpsertDayAsync(
            CreateBatch(
                s_firstRun,
                Observation("kpi-a", created: 3, completed: 2, p50: 600),
                Observation("kpi-b", created: 0, completed: 1, p50: null)
            )
        );

        var appA = await GetRow("kpi-a");
        Assert.Equal(s_day, appA.MetricDate);
        Assert.Equal(3, appA.InstancesCreated);
        Assert.Equal(2, appA.InstancesCompleted);
        Assert.Equal(600, appA.SecondsToCompleteP50);
        Assert.Equal(s_firstRun, appA.ComputedAt);

        var appB = await GetRow("kpi-b");
        Assert.Equal(1, appB.InstancesCompleted);
        Assert.Null(appB.SecondsToCompleteP50);
    }

    [Fact]
    public async Task UpsertDayAsync_SecondRun_ShouldReplaceTheDay()
    {
        var repository = CreateRepository();
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, Observation("kpi-a", created: 3, completed: 2, p50: 600))
        );

        await repository.UpsertDayAsync(
            CreateBatch(s_secondRun, Observation("kpi-a", created: 4, completed: 3, p50: 500))
        );

        var row = await GetRow("kpi-a");
        Assert.Equal(4, row.InstancesCreated);
        Assert.Equal(3, row.InstancesCompleted);
        Assert.Equal(500, row.SecondsToCompleteP50);
        Assert.Equal(s_secondRun, row.ComputedAt);
        Assert.Equal(1, await CountRows());
    }

    [Fact]
    public async Task UpsertDayAsync_ShouldKeepOtherDaysEnvironmentsAndOrgs()
    {
        var repository = CreateRepository();
        var otherOrg = TestDataHelper.GenerateTestRepoName();
        await repository.UpsertDayAsync(CreateBatch(s_firstRun, Observation("kpi-a", created: 1)));
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, Observation("kpi-a", created: 2)) with
            {
                MetricDate = s_day.AddDays(-1),
            }
        );
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, Observation("kpi-a", created: 3)) with
            {
                Environment = "production",
            }
        );
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, Observation("kpi-a", created: 4)) with
            {
                Org = otherOrg,
            }
        );

        await repository.UpsertDayAsync(CreateBatch(s_secondRun, Observation("kpi-a", created: 10)));

        Assert.Equal(10, (await GetRow("kpi-a")).InstancesCreated);
        Assert.Equal(2, (await GetRow("kpi-a", date: s_day.AddDays(-1))).InstancesCreated);
        Assert.Equal(3, (await GetRow("kpi-a", environment: "production")).InstancesCreated);
        Assert.Equal(4, (await GetRow("kpi-a", org: otherOrg)).InstancesCreated);
    }

    [Fact]
    public async Task UpsertDayAsync_WithoutApps_ShouldStoreNothing()
    {
        await CreateRepository().UpsertDayAsync(CreateBatch(s_firstRun));

        Assert.Equal(0, await CountRows());
    }

    private AppDailyMetricsRepositoryImplementation CreateRepository() => new(DbFixture.DbContext);

    private AppDailyMetricsBatch CreateBatch(
        DateTimeOffset computedAt,
        params AppDailyMetricsObservation[] observations
    )
    {
        return new AppDailyMetricsBatch
        {
            Org = _org,
            Environment = Environment,
            MetricDate = s_day,
            ComputedAt = computedAt,
            Observations = observations,
        };
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

    private Task<AppDailyMetricsDbModel> GetRow(
        string app,
        DateOnly? date = null,
        string environment = Environment,
        string org = null
    )
    {
        var metricDate = date ?? s_day;
        var orgName = org ?? _org;
        return DbFixture
            .DbContext.AppDailyMetrics.AsNoTracking()
            .SingleAsync(m =>
                m.Org == orgName && m.Environment == environment && m.MetricDate == metricDate && m.App == app
            );
    }

    private Task<int> CountRows()
    {
        return DbFixture.DbContext.AppDailyMetrics.AsNoTracking().CountAsync(m => m.Org == _org);
    }
}
