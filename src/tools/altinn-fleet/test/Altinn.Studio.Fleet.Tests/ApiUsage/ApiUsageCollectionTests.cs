using System.Collections.Concurrent;
using Altinn.Studio.Fleet.ApiUsage;
using Altinn.Studio.Fleet.Store;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Tests.ApiUsage;

public sealed class ApiUsageCollectionTests
{
    [Fact]
    public async Task Collect_AnalyzesACopyOfEachApp_AndLeavesTheStoreAsItWas()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "app-two", "2.0.0");
        await context.SyncProd();
        string[] before = Folder.Tree(context.ProdPath);
        var analyzer = new FakeAnalyzer();

        CollectResult result = await Collect(context, analyzer);

        Assert.Equal((2, 2, 0, 0, 0), (result.Apps, result.Analyzed, result.Unchanged, result.Failed, result.Removed));
        Assert.Equal(before, Folder.Tree(context.ProdPath));
        Assert.All(
            analyzer.Folders.Values,
            folder => Assert.False(folder.StartsWith(context.ProdPath, StringComparison.Ordinal))
        );
        Assert.True(analyzer.SawProject.Values.All(seen => seen));
        Assert.Equal(
            [
                ["ssb", "app-two", "2.0.0", "M:Altinn.App.Core.Features.IDataProcessor.ProcessDataWrite", "app"],
                ["ttd", "app-one", "1.0.0", "M:Altinn.App.Core.Features.IDataProcessor.ProcessDataWrite", "app"],
            ],
            Query(
                context,
                "SELECT r.org, r.app, r.version, u.symbol, u.source FROM runs r JOIN uses u USING (env, org, app) "
                    + "ORDER BY r.org"
            )
        );
    }

    [Fact]
    public async Task Collect_AgainAnalyzesOnlyWhatChangedOrFailed_AndForgetsAppsThatStopped()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "unchanged", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "updated", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "stopped", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "broken", "1.0.0");
        await context.SyncProd();
        await Collect(context, new FakeAnalyzer());
        context.Altinn.Deploy("prod", "ttd", "updated", "1.0.1");
        context.Altinn.Deployments[("prod", "ttd")].Remove("stopped");
        await context.SyncProd();
        var analyzer = new FakeAnalyzer();

        CollectResult result = await Collect(context, analyzer);

        Assert.Equal(["broken", "updated"], analyzer.Folders.Keys.Order(StringComparer.Ordinal));
        Assert.Equal((3, 2, 1, 1, 1), (result.Apps, result.Analyzed, result.Unchanged, result.Failed, result.Removed));
        Assert.Equal(
            [
                ["broken", "1.0.0", "Broken on purpose."],
                ["unchanged", "1.0.0", "NULL"],
                ["updated", "1.0.1", "NULL"],
            ],
            Query(context, "SELECT app, version, failure FROM runs ORDER BY app")
        );
    }

    [Fact]
    public async Task Collect_WithOrgs_KeepsTheOtherServiceOwnersApps()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "app-two", "1.0.0");
        await context.SyncProd();
        await Collect(context, new FakeAnalyzer());

        CollectResult result = await Collect(context, new FakeAnalyzer(), force: true, orgs: ["ttd"]);

        Assert.Equal((1, 1, 0), (result.Apps, result.Analyzed, result.Removed));
        Assert.Equal(
            [
                ["ssb"],
                ["ttd"],
            ],
            Query(context, "SELECT org FROM runs ORDER BY org")
        );
    }

    private static async Task<CollectResult> Collect(
        FleetTestContext context,
        FakeAnalyzer analyzer,
        bool force = false,
        string[]? orgs = null
    )
    {
        using UsageDatabase database = UsageDatabase.Open(DatabasePath(context));
        List<CollectResult> results = await new ApiUsageCollection(context.Store, database, analyzer).Collect(
            new CollectOptions
            {
                Environments = [FleetTestContext.Prod],
                Force = force,
                Orgs = orgs?.Select(Common.Domain.ServiceOwnerCode.Parse).ToHashSet(),
            },
            null,
            TestContext.Current.CancellationToken
        );
        return Assert.Single(results);
    }

    private static List<string[]> Query(FleetTestContext context, string sql)
    {
        using SqliteConnection connection = FleetStoreReader.OpenFileForQueries(context.Store, DatabasePath(context));
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = sql;
        using SqliteDataReader reader = command.ExecuteReader();
        var rows = new List<string[]>();
        while (reader.Read())
        {
            rows.Add([
                .. Enumerable
                    .Range(0, reader.FieldCount)
                    .Select(i => reader.IsDBNull(i) ? "NULL" : reader.GetString(i)),
            ]);
        }

        return rows;
    }

    private static string DatabasePath(FleetTestContext context) => Path.Join(context.Root, "usage.sqlite");

    /// <summary>Records which folder each app was analyzed in, and fails the app named <c>broken</c>.</summary>
    private sealed class FakeAnalyzer : IAppAnalyzer
    {
        public ConcurrentDictionary<string, string> Folders { get; } = new();

        public ConcurrentDictionary<string, bool> SawProject { get; } = new();

        public Task<AppUsage> Analyze(string appDir, CancellationToken cancellationToken)
        {
            string app = Path.GetFileName(appDir);
            Folders[app] = appDir;
            SawProject[app] = File.Exists(Path.Join(appDir, "App", "App.csproj"));
            return Task.FromResult(
                app == "broken"
                    ? AppUsage.Failed("Broken on purpose.", 0)
                    : new AppUsage(
                        "App/App.csproj",
                        "8.5.0.0",
                        null,
                        null,
                        [],
                        0,
                        [],
                        [],
                        1,
                        [
                            new SymbolUse(
                                "M:Altinn.App.Core.Features.IDataProcessor.ProcessDataWrite",
                                "Altinn.App.Core",
                                UseKinds.Implement,
                                UseSources.App,
                                1,
                                "App/logic/DataProcessor.cs:10"
                            ),
                        ],
                        []
                    )
            );
        }
    }
}
