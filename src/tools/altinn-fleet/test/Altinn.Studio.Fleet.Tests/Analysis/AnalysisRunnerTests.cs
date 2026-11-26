using System.Collections.Concurrent;
using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Store;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Tests.Analysis;

public sealed class AnalysisRunnerTests
{
    [Fact]
    public async Task Run_AnalyzesACopyOfEachApp_AndLeavesTheStoreAsItWas()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "app-two", "2.0.0");
        await context.SyncProd();
        string[] before = Folder.Tree(context.ProdPath);
        var analysis = new FakeAnalysis();

        AnalysisRunResult result = await Run(context, analysis);

        Assert.Equal(("fake", 2, 2, 0, 0, 0), Counts(result));
        Assert.Equal(before, Folder.Tree(context.ProdPath));
        Assert.All(
            analysis.Folders.Values,
            folder => Assert.False(folder.StartsWith(context.ProdPath, StringComparison.Ordinal))
        );
        Assert.Equal(
            [
                ["fake", "ssb", "app-two", "2.0.0", "NULL", "1"],
                ["fake", "ttd", "app-one", "1.0.0", "NULL", "1"],
            ],
            Query(
                context,
                "SELECT r.analysis, r.org, r.app, r.version, r.failure, f.had_project "
                    + "FROM runs r JOIN fake_apps f USING (env, org, app) ORDER BY r.org"
            )
        );
    }

    [Fact]
    public async Task Run_AgainAnalyzesOnlyWhatChangedOrFailed_AndForgetsAppsThatStopped()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "unchanged", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "updated", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "stopped", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "broken", "1.0.0");
        await context.SyncProd();
        await Run(context, new FakeAnalysis());
        context.Altinn.Deploy("prod", "ttd", "updated", "1.0.1");
        context.Altinn.Deployments[("prod", "ttd")].Remove("stopped");
        await context.SyncProd();
        var analysis = new FakeAnalysis();

        AnalysisRunResult result = await Run(context, analysis);

        Assert.Equal(["broken", "updated"], analysis.Folders.Keys.Order(StringComparer.Ordinal));
        Assert.Equal(("fake", 3, 2, 1, 1, 1), Counts(result));
        Assert.Equal(
            [
                ["broken", "1.0.0", "Broken on purpose."],
                ["unchanged", "1.0.0", "NULL"],
                ["updated", "1.0.1", "NULL"],
            ],
            Query(context, "SELECT app, version, failure FROM runs ORDER BY app")
        );
        Assert.Equal(
            [
                ["unchanged"],
                ["updated"],
            ],
            Query(context, "SELECT app FROM fake_apps ORDER BY app")
        );
    }

    [Fact]
    public async Task Run_WithOrgs_KeepsTheOtherServiceOwnersApps()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "app-two", "1.0.0");
        await context.SyncProd();
        await Run(context, new FakeAnalysis());

        AnalysisRunResult result = await Run(context, new FakeAnalysis(), force: true, orgs: ["ttd"]);

        Assert.Equal((1, 1, 0), (result.Apps, result.Analyzed, result.Removed));
        Assert.Equal(
            [
                ["ssb"],
                ["ttd"],
            ],
            Query(context, "SELECT org FROM runs ORDER BY org")
        );
    }

    [Fact]
    public async Task Run_WithANewVersionOfAnAnalysis_ReplacesItsTablesAndAnalyzesEveryAppAgain()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        await Run(context, new FakeAnalysis());
        var other = new FakeAnalysis { Name = "other" };
        await Run(context, other);

        AnalysisRunResult result = await Run(context, new FakeAnalysis { Version = 2, Column = "seen" });

        Assert.Equal(("fake", 1, 1, 0, 0, 0), Counts(result));
        Assert.Equal(
            [
                ["app-one", "1"],
            ],
            Query(context, "SELECT app, seen FROM fake_apps")
        );
        Assert.Equal(
            [
                ["fake"],
                ["other"],
            ],
            Query(context, "SELECT analysis FROM runs ORDER BY analysis")
        );
    }

    [Fact]
    public async Task Run_WithAnAnalysisThatCreatesTablesOutsideItsName_Throws()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Run(context, new FakeAnalysis { Name = "misnamed" })
        );

        Assert.Contains("must start with misnamed_", ex.Message, StringComparison.Ordinal);
    }

    private static (string, int, int, int, int, int) Counts(AnalysisRunResult r) =>
        (r.Analysis, r.Apps, r.Analyzed, r.Unchanged, r.Failed, r.Removed);

    private static async Task<AnalysisRunResult> Run(
        FleetTestContext context,
        FakeAnalysis analysis,
        bool force = false,
        string[]? orgs = null
    )
    {
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath(context));
        List<AnalysisRunResult> results = await new AnalysisRunner(
            context.Store,
            database,
            [analysis],
            new InProcessExecutor()
        ).Run(
            new AnalysisOptions
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
                    .Select(i => reader.IsDBNull(i) ? "NULL" : Convert.ToString(reader.GetValue(i), null)!),
            ]);
        }

        return rows;
    }

    private static string DatabasePath(FleetTestContext context) => Path.Join(context.Root, "analysis.sqlite");

    /// <summary>Runs the analysis in this process, and turns what it throws into a failure.</summary>
    private sealed class InProcessExecutor : IAnalysisExecutor
    {
        public async Task<string?> Run(
            IAppAnalysis analysis,
            string appDir,
            string resultFile,
            CancellationToken cancellationToken
        )
        {
            try
            {
                await analysis.Analyze(appDir, resultFile, cancellationToken);
                return null;
            }
            catch (InvalidOperationException ex)
            {
                return ex.Message;
            }
        }
    }

    /// <summary>
    /// Records whether each app's copy has its project, and which folder it was analyzed in. Fails the app named
    /// <c>broken</c>. Named <c>misnamed</c>, it creates a table outside its name.
    /// </summary>
    private sealed class FakeAnalysis : IAppAnalysis
    {
        public string Name { get; init; } = "fake";

        public int Version { get; init; } = 1;

        public string Column { get; init; } = "had_project";

        public string Schema =>
            Name == "misnamed"
                ? "CREATE TABLE elsewhere (env TEXT, org TEXT, app TEXT);"
                : $"CREATE TABLE {Name}_apps (env TEXT, org TEXT, app TEXT, {Column} INTEGER, PRIMARY KEY (env, org, app));";

        public IReadOnlyList<string> AppTables => [$"{Name}_apps"];

        public ConcurrentDictionary<string, string> Folders { get; } = new();

        public Task Analyze(string appDir, string resultFile, CancellationToken cancellationToken)
        {
            string app = Path.GetFileName(appDir);
            Folders[app] = appDir;
            if (app == "broken")
            {
                throw new InvalidOperationException("Broken on purpose.");
            }

            return File.WriteAllTextAsync(
                resultFile,
                File.Exists(Path.Join(appDir, "App", "App.csproj")) ? "1" : "0",
                cancellationToken
            );
        }

        public string? Record(AppRecorder recorder, string resultFile)
        {
            using AppRows rows = recorder.Rows($"{Name}_apps", [Column]);
            rows.Add(int.Parse(File.ReadAllText(resultFile), System.Globalization.CultureInfo.InvariantCulture));
            return null;
        }
    }
}
