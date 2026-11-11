using System;
using System.Collections.Generic;
using System.Linq;
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
    public async Task UpsertDayAsync_WithSnapshot_ShouldStoreFlowSnapshotAndTaskRows()
    {
        var repository = CreateRepository();

        await repository.UpsertDayAsync(
            CreateBatch(
                s_firstRun,
                includesSnapshot: true,
                Observation(
                    "kpi-a",
                    created: 3,
                    completed: 2,
                    p50: 600,
                    open: 5,
                    openOld: 1,
                    unconfirmedOld: 4,
                    tasks: [("Task_1", 4), ("Task_2", 1)]
                ),
                Observation("kpi-b", created: 0, completed: 0, p50: null, open: 0, openOld: 0, unconfirmedOld: 7)
            )
        );

        var appA = await GetRow("kpi-a");
        Assert.Equal(s_day, appA.MetricDate);
        Assert.Equal(3, appA.InstancesCreated);
        Assert.Equal(2, appA.InstancesCompleted);
        Assert.Equal(600, appA.SecondsToCompleteP50);
        Assert.Equal(5, appA.OpenInstances);
        Assert.Equal(1, appA.OpenOver90Days);
        Assert.Equal(4, appA.UnconfirmedOver90Days);
        Assert.Equal(s_firstRun, appA.ComputedAt);
        Assert.Equal(new Dictionary<string, int> { ["Task_1"] = 4, ["Task_2"] = 1 }, await GetTaskRows("kpi-a"));

        var appB = await GetRow("kpi-b");
        Assert.Null(appB.SecondsToCompleteP50);
        Assert.Equal(0, appB.OpenInstances);
        Assert.Equal(7, appB.UnconfirmedOver90Days);
        Assert.Empty(await GetTaskRows("kpi-b"));
    }

    [Fact]
    public async Task UpsertDayAsync_WithoutSnapshot_ShouldStoreFlowAndLeaveSnapshotEmpty()
    {
        var repository = CreateRepository();

        await repository.UpsertDayAsync(
            CreateBatch(
                s_firstRun,
                includesSnapshot: false,
                Observation(
                    "kpi-a",
                    created: 3,
                    completed: 2,
                    p50: 600,
                    open: 5,
                    openOld: 1,
                    unconfirmedOld: 4,
                    tasks: [("Task_1", 5)]
                )
            )
        );

        var row = await GetRow("kpi-a");
        Assert.Equal(3, row.InstancesCreated);
        Assert.Equal(600, row.SecondsToCompleteP50);
        Assert.Null(row.OpenInstances);
        Assert.Null(row.OpenOver90Days);
        Assert.Null(row.UnconfirmedOver90Days);
        Assert.Empty(await GetTaskRows("kpi-a"));
    }

    [Fact]
    public async Task UpsertDayAsync_SecondRunWithSnapshot_ShouldReplaceEverythingForTheDay()
    {
        var repository = CreateRepository();
        await repository.UpsertDayAsync(
            CreateBatch(
                s_firstRun,
                includesSnapshot: true,
                Observation(
                    "kpi-a",
                    created: 3,
                    completed: 2,
                    p50: 600,
                    open: 5,
                    openOld: 1,
                    unconfirmedOld: 4,
                    tasks: [("Task_1", 4), ("Task_2", 1)]
                )
            )
        );

        await repository.UpsertDayAsync(
            CreateBatch(
                s_secondRun,
                includesSnapshot: true,
                Observation(
                    "kpi-a",
                    created: 4,
                    completed: 3,
                    p50: 500,
                    open: 6,
                    openOld: 2,
                    unconfirmedOld: 5,
                    tasks: [("Task_1", 6)]
                )
            )
        );

        var row = await GetRow("kpi-a");
        Assert.Equal(4, row.InstancesCreated);
        Assert.Equal(3, row.InstancesCompleted);
        Assert.Equal(500, row.SecondsToCompleteP50);
        Assert.Equal(6, row.OpenInstances);
        Assert.Equal(2, row.OpenOver90Days);
        Assert.Equal(5, row.UnconfirmedOver90Days);
        Assert.Equal(s_secondRun, row.ComputedAt);
        Assert.Equal(new Dictionary<string, int> { ["Task_1"] = 6 }, await GetTaskRows("kpi-a"));
        Assert.Equal(1, await CountRows());
    }

    [Fact]
    public async Task UpsertDayAsync_SecondRunWithoutSnapshot_ShouldReplaceFlowAndKeepSnapshot()
    {
        var repository = CreateRepository();
        await repository.UpsertDayAsync(
            CreateBatch(
                s_firstRun,
                includesSnapshot: true,
                Observation(
                    "kpi-a",
                    created: 3,
                    completed: 2,
                    p50: 600,
                    open: 5,
                    openOld: 1,
                    unconfirmedOld: 4,
                    tasks: [("Task_1", 5)]
                )
            )
        );

        await repository.UpsertDayAsync(
            CreateBatch(
                s_secondRun,
                includesSnapshot: false,
                Observation(
                    "kpi-a",
                    created: 4,
                    completed: 3,
                    p50: 500,
                    open: 99,
                    openOld: 99,
                    unconfirmedOld: 99,
                    tasks: [("Task_9", 99)]
                )
            )
        );

        var row = await GetRow("kpi-a");
        Assert.Equal(4, row.InstancesCreated);
        Assert.Equal(500, row.SecondsToCompleteP50);
        Assert.Equal(5, row.OpenInstances);
        Assert.Equal(1, row.OpenOver90Days);
        Assert.Equal(4, row.UnconfirmedOver90Days);
        Assert.Equal(s_firstRun, row.ComputedAt);
        Assert.Equal(new Dictionary<string, int> { ["Task_1"] = 5 }, await GetTaskRows("kpi-a"));
    }

    [Fact]
    public async Task UpsertDayAsync_ShouldKeepOtherDaysEnvironmentsAndOrgs()
    {
        var repository = CreateRepository();
        var otherOrg = TestDataHelper.GenerateTestRepoName();
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, includesSnapshot: true, Observation("kpi-a", open: 1, tasks: [("Task_1", 1)]))
        );
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, includesSnapshot: true, Observation("kpi-a", open: 2, tasks: [("Task_1", 2)])) with
            {
                MetricDate = s_day.AddDays(-1),
            }
        );
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, includesSnapshot: true, Observation("kpi-a", open: 3, tasks: [("Task_1", 3)])) with
            {
                Environment = "production",
            }
        );
        await repository.UpsertDayAsync(
            CreateBatch(s_firstRun, includesSnapshot: true, Observation("kpi-a", open: 4, tasks: [("Task_1", 4)])) with
            {
                Org = otherOrg,
            }
        );

        await repository.UpsertDayAsync(
            CreateBatch(s_secondRun, includesSnapshot: true, Observation("kpi-a", open: 10, tasks: [("Task_1", 10)]))
        );

        Assert.Equal(10, (await GetRow("kpi-a")).OpenInstances);
        Assert.Equal(2, (await GetRow("kpi-a", date: s_day.AddDays(-1))).OpenInstances);
        Assert.Equal(3, (await GetRow("kpi-a", environment: "production")).OpenInstances);
        Assert.Equal(4, (await GetRow("kpi-a", org: otherOrg)).OpenInstances);
        Assert.Equal(
            4,
            await DbFixture
                .DbContext.AppDailyTaskMetrics.AsNoTracking()
                .CountAsync(t => t.App == "kpi-a" && (t.Org == _org || t.Org == otherOrg))
        );
    }

    [Fact]
    public async Task UpsertDayAsync_WithoutApps_ShouldStoreNothing()
    {
        var repository = CreateRepository();

        await repository.UpsertDayAsync(CreateBatch(s_firstRun, includesSnapshot: true));

        Assert.Equal(0, await CountRows());
    }

    private AppDailyMetricsRepositoryImplementation CreateRepository() => new(DbFixture.DbContext);

    private AppDailyMetricsBatch CreateBatch(
        DateTimeOffset computedAt,
        bool includesSnapshot,
        params AppDailyMetricsObservation[] observations
    )
    {
        return new AppDailyMetricsBatch
        {
            Org = _org,
            Environment = Environment,
            MetricDate = s_day,
            ComputedAt = computedAt,
            IncludesSnapshot = includesSnapshot,
            Observations = observations,
        };
    }

    private static AppDailyMetricsObservation Observation(
        string app,
        int created = 0,
        int completed = 0,
        int? p50 = null,
        int open = 0,
        int openOld = 0,
        int unconfirmedOld = 0,
        (string TaskId, int Open)[] tasks = null
    )
    {
        return new AppDailyMetricsObservation
        {
            App = app,
            InstancesCreated = created,
            InstancesCompleted = completed,
            SecondsToCompleteP50 = p50,
            OpenInstances = open,
            OpenOver90Days = openOld,
            UnconfirmedOver90Days = unconfirmedOld,
            OpenByTask = (tasks ?? []).ToDictionary(task => task.TaskId, task => task.Open),
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

    private async Task<Dictionary<string, int>> GetTaskRows(string app)
    {
        return await DbFixture
            .DbContext.AppDailyTaskMetrics.AsNoTracking()
            .Where(t => t.Org == _org && t.Environment == Environment && t.MetricDate == s_day && t.App == app)
            .ToDictionaryAsync(t => t.TaskId, t => t.OpenInstances);
    }

    private Task<int> CountRows()
    {
        return DbFixture.DbContext.AppDailyMetrics.AsNoTracking().CountAsync(m => m.Org == _org);
    }
}
