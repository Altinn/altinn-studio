using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppActivity;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.EntityFrameworkCore;
using Xunit;
using AppActivityRepositoryImplementation = Altinn.Studio.Designer.Repository.ORMImplementation.AppActivityRepository;

namespace Designer.Tests.DbIntegrationTests.AppActivityRepository;

public class UpsertBatchAsyncIntegrationTests : DbIntegrationTestsBase
{
    private const string Environment = "tt02";
    private static readonly DateTimeOffset s_firstCollection = new(2026, 10, 13, 2, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset s_secondCollection = s_firstCollection.AddDays(1);

    private readonly string _org = TestDataHelper.GenerateTestRepoName();

    public UpsertBatchAsyncIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task UpsertBatchAsync_FirstCollection_ShouldInsertDeployedAppsWithoutSignals()
    {
        var repository = CreateRepository();
        var lastWrite = s_firstCollection.AddDays(-5);

        await repository.UpsertBatchAsync(
            CreateBatch(
                s_firstCollection,
                29,
                Observation("idle-app", deployed: true),
                Observation(
                    "busy-app",
                    deployed: true,
                    lastWriteAt: lastWrite,
                    counts: new Dictionary<string, double> { ["write"] = 42 }
                )
            )
        );

        var idle = await GetRow("idle-app");
        Assert.True(idle.Deployed);
        Assert.Null(idle.LastWriteAt);
        Assert.Empty(ParseCounts(idle));
        Assert.Equal(29, idle.LatestWindowDays);
        Assert.Equal(s_firstCollection.AddDays(-29), idle.ObservedSince);
        Assert.Equal(s_firstCollection, idle.FirstCollectedAt);
        Assert.Equal(s_firstCollection, idle.LastCollectedAt);

        var busy = await GetRow("busy-app");
        Assert.Equal(lastWrite, busy.LastWriteAt);
        Assert.Equal(42, ParseCounts(busy)["write"]);
    }

    [Fact]
    public async Task UpsertBatchAsync_LaterCollection_ShouldKeepGreatestTimestampsAndInitialObservedSince()
    {
        var repository = CreateRepository();
        var originalWrite = s_firstCollection.AddDays(-2);
        var originalRead = s_firstCollection.AddDays(-20);
        var newerRead = s_secondCollection.AddHours(-1);

        await repository.UpsertBatchAsync(
            CreateBatch(
                s_firstCollection,
                29,
                Observation(
                    "app",
                    deployed: true,
                    lastWriteAt: originalWrite,
                    lastReadAt: originalRead,
                    counts: new Dictionary<string, double> { ["write"] = 3, ["read"] = 7 }
                )
            )
        );

        await repository.UpsertBatchAsync(
            CreateBatch(
                s_secondCollection,
                2,
                Observation(
                    "app",
                    deployed: true,
                    lastWriteAt: originalWrite.AddDays(-1),
                    lastReadAt: newerRead,
                    counts: new Dictionary<string, double> { ["read"] = 1 }
                )
            )
        );

        var row = await GetRow("app");
        Assert.Equal(originalWrite, row.LastWriteAt);
        Assert.Equal(newerRead, row.LastReadAt);
        Assert.Equal(new Dictionary<string, double> { ["read"] = 1 }, ParseCounts(row));
        Assert.Equal(2, row.LatestWindowDays);
        Assert.Equal(s_firstCollection.AddDays(-29), row.ObservedSince);
        Assert.Equal(s_firstCollection, row.FirstCollectedAt);
        Assert.Equal(s_secondCollection, row.LastCollectedAt);
    }

    [Fact]
    public async Task UpsertBatchAsync_AfterMissedCollections_ShouldMoveObservedSinceToTheNewWindow()
    {
        var repository = CreateRepository();
        var lastWrite = s_firstCollection.AddDays(-1);
        var collectionAfterGap = s_firstCollection.AddDays(40);
        await repository.UpsertBatchAsync(
            CreateBatch(
                s_firstCollection,
                29,
                Observation("tracked-app", deployed: true, lastWriteAt: lastWrite),
                Observation("removed-app", deployed: true)
            )
        );

        await repository.UpsertBatchAsync(
            CreateBatch(collectionAfterGap, 29, Observation("tracked-app", deployed: true))
        );

        var tracked = await GetRow("tracked-app");
        Assert.Equal(collectionAfterGap.AddDays(-29), tracked.ObservedSince);
        Assert.Equal(lastWrite, tracked.LastWriteAt);
        var removed = await GetRow("removed-app");
        Assert.Equal(collectionAfterGap.AddDays(-29), removed.ObservedSince);
    }

    [Fact]
    public async Task UpsertBatchAsync_AppMissingFromLaterCollection_ShouldBeMarkedNotDeployed()
    {
        var repository = CreateRepository();
        var lastWrite = s_firstCollection.AddDays(-1);
        await repository.UpsertBatchAsync(
            CreateBatch(
                s_firstCollection,
                29,
                Observation("kept-app", deployed: true),
                Observation(
                    "removed-app",
                    deployed: true,
                    lastWriteAt: lastWrite,
                    counts: new Dictionary<string, double> { ["write"] = 1 }
                )
            )
        );
        await repository.UpsertBatchAsync(
            CreateBatch(s_firstCollection, 29, Observation("removed-app", deployed: true)) with
            {
                Environment = "at22",
            }
        );

        await repository.UpsertBatchAsync(CreateBatch(s_secondCollection, 2, Observation("kept-app", deployed: true)));

        var removed = await GetRow("removed-app");
        Assert.False(removed.Deployed);
        Assert.Equal(s_secondCollection, removed.LastCollectedAt);
        Assert.Equal(lastWrite, removed.LastWriteAt);
        Assert.Equal(s_firstCollection.AddDays(-29), removed.ObservedSince);
        Assert.Empty(ParseCounts(removed));

        Assert.True((await GetRow("kept-app")).Deployed);
        Assert.True((await GetRow("removed-app", "at22")).Deployed);
    }

    [Fact]
    public async Task CollectionState_ShouldReflectLatestCollectionAndDeployedApps()
    {
        var repository = CreateRepository();
        Assert.Null(await repository.GetLatestCollectedAtAsync(_org, Environment));
        Assert.False(await repository.HasDeployedAppsAsync(_org, Environment));

        await repository.UpsertBatchAsync(CreateBatch(s_firstCollection, 29, Observation("app", deployed: true)));
        Assert.True(await repository.HasDeployedAppsAsync(_org, Environment));

        await repository.UpsertBatchAsync(CreateBatch(s_secondCollection, 2));

        Assert.Equal(s_secondCollection, await repository.GetLatestCollectedAtAsync(_org, Environment));
        Assert.False(await repository.HasDeployedAppsAsync(_org, Environment));
        Assert.Null(await repository.GetLatestCollectedAtAsync(_org, "at22"));
    }

    [Fact]
    public async Task GetForEnvironmentAsync_ShouldReturnTheEnvironmentsRows()
    {
        var repository = CreateRepository();
        var lastWrite = s_firstCollection.AddDays(-3);
        await repository.UpsertBatchAsync(
            CreateBatch(
                s_firstCollection,
                29,
                Observation("idle-app", deployed: true),
                Observation("busy-app", deployed: true, lastWriteAt: lastWrite)
            )
        );

        var rows = await repository.GetForEnvironmentAsync(_org, Environment);

        Assert.Equal(["busy-app", "idle-app"], rows.Select(r => r.App).Order());
        var busy = rows.Single(r => r.App == "busy-app");
        Assert.Equal(lastWrite, busy.LastWriteAt);
        Assert.Equal(s_firstCollection.AddDays(-29), busy.ObservedSince);
        Assert.Equal(s_firstCollection, busy.LastCollectedAt);
        Assert.Null(rows.Single(r => r.App == "idle-app").LastWriteAt);
        Assert.Empty(await repository.GetForEnvironmentAsync(_org, "at22"));
    }

    private AppActivityRepositoryImplementation CreateRepository()
    {
        return new AppActivityRepositoryImplementation(DbFixture.DbContext);
    }

    private AppActivityCollectionBatch CreateBatch(
        DateTimeOffset collectedAt,
        int windowDays,
        params AppActivityObservation[] observations
    )
    {
        return new AppActivityCollectionBatch
        {
            Org = _org,
            Environment = Environment,
            CollectedAt = collectedAt,
            WindowDays = windowDays,
            Observations = observations,
        };
    }

    private static AppActivityObservation Observation(
        string app,
        bool deployed,
        DateTimeOffset? lastWriteAt = null,
        DateTimeOffset? lastReadAt = null,
        Dictionary<string, double> counts = null
    )
    {
        return new AppActivityObservation
        {
            App = app,
            Deployed = deployed,
            LastWriteAt = lastWriteAt,
            LastReadAt = lastReadAt,
            WindowCounts = counts ?? [],
        };
    }

    private async Task<AppActivityDbModel> GetRow(string app, string environment = Environment)
    {
        return await DbFixture
            .DbContext.AppActivity.AsNoTracking()
            .SingleAsync(a => a.Org == _org && a.Environment == environment && a.App == app);
    }

    private static Dictionary<string, double> ParseCounts(AppActivityDbModel row)
    {
        return JsonSerializer.Deserialize<Dictionary<string, double>>(row.LatestWindowCounts);
    }
}
