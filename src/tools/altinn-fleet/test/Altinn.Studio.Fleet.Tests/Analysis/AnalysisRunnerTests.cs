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

    [Fact]
    public async Task Run_WithANewVersionOfAnAnalysis_KeepsTheTablesOfOneWhoseNameStartsTheSame()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        await Run(context, new FakeAnalysis());
        await Run(context, new FakeAnalysis { Name = "fake-two" });

        await Run(context, new FakeAnalysis { Version = 2 });

        Assert.Equal(
            [
                ["app-one"],
            ],
            Query(context, "SELECT app FROM fake_two_apps")
        );
        Assert.Equal(
            [
                ["fake"],
                ["fake-two"],
            ],
            Query(context, "SELECT analysis FROM runs ORDER BY analysis")
        );
    }

    [Fact]
    public async Task Run_AnalyzesAgainAnAppWhoseVersionIsNotKnown()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        await Run(context, new FakeAnalysis());
        // An index rebuilt without the old one does not know the deployed versions.
        File.Delete(context.Store.IndexPath(FleetTestContext.Prod));
        await context.Sync.RebuildIndex(FleetTestContext.Prod, 1, null, TestContext.Current.CancellationToken);
        await Run(context, new FakeAnalysis());
        var analysis = new FakeAnalysis();

        AnalysisRunResult result = await Run(context, analysis);

        Assert.Equal(("fake", 1, 1, 0, 0, 0), Counts(result));
        Assert.Equal(
            [
                ["NULL"],
            ],
            Query(context, "SELECT version FROM runs")
        );
    }

    [Fact]
    public void CopyFolder_MakesWritableCopiesOfReadOnlyFiles()
    {
        string root = Folder.CreateTemporary();
        try
        {
            string source = Path.Join(root, "source");
            Directory.CreateDirectory(Path.Join(source, "App"));
            string file = Path.Join(source, "App", "App.csproj");
            File.WriteAllText(file, "<Project />");
            File.SetAttributes(file, FileAttributes.ReadOnly);

            AnalysisRunner.CopyFolder(source, Path.Join(root, "copy"));

            Assert.False(
                File.GetAttributes(Path.Join(root, "copy", "App", "App.csproj")).HasFlag(FileAttributes.ReadOnly)
            );
            Directory.Delete(Path.Join(root, "copy"), recursive: true);
            File.SetAttributes(file, FileAttributes.Normal);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ChildProcessExecutor_StopsAtTheDeadline_WhenAProcessItStartedHoldsTheOutput()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Starts a background process with sh");
        string root = Folder.CreateTemporary();
        try
        {
            // sh -c SCRIPT gets the analysis's name, the app's folder and the result file as $0, $1 and $2.
            var executor = new ChildProcessExecutor(["sh", "-c", "sleep 20 & exit 3"], TimeSpan.FromSeconds(1));
            var timer = System.Diagnostics.Stopwatch.StartNew();

            string? failure = await executor.Run(
                new FakeAnalysis(),
                root,
                Path.Join(root, "result"),
                TestContext.Current.CancellationToken
            );

            Assert.True(timer.Elapsed < TimeSpan.FromSeconds(10), $"Took {timer.Elapsed}.");
            Assert.Contains("exited with code 3", failure, StringComparison.Ordinal);
            Assert.Contains("still held its output", failure, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task Run_CompletesEachAnalysisAfterItsApps()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "app-two", "2.0.0");
        await context.SyncProd();
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath(context));

        AnalysisReport report = await new AnalysisRunner(
            context.Store,
            database,
            [new FakeAnalysis(), new FakeAnalysis { Name = "quiet", Summarizes = false }],
            new InProcessExecutor()
        ).Run(
            new AnalysisOptions { Environments = [FleetTestContext.Prod] },
            null,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(new AnalysisCompletion("fake", "2 apps recorded"), Assert.Single(report.Completions));
    }

    [Fact]
    public async Task Run_WithTheSameAnalysisTwice_RunsItOnce()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        var analysis = new FakeAnalysis();
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath(context));

        AnalysisReport report = await new AnalysisRunner(
            context.Store,
            database,
            [analysis, analysis],
            new InProcessExecutor()
        ).Run(
            new AnalysisOptions { Environments = [FleetTestContext.Prod] },
            null,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(("fake", 1, 1, 0, 0, 0), Counts(Assert.Single(report.Results)));
    }

    [Fact]
    public async Task OpenAndPrepare_FromTwoConnectionsAtOnce_BothSucceed()
    {
        using var context = new FleetTestContext();
        string path = DatabasePath(context);

        await Task.WhenAll(
            Enumerable
                .Range(0, 4)
                .Select(_ =>
                    Task.Run(
                        () =>
                        {
                            using AnalysisDatabase database = AnalysisDatabase.Open(path);
                            database.Prepare(new FakeAnalysis());
                        },
                        TestContext.Current.CancellationToken
                    )
                )
        );

        Assert.Equal(
            [
                ["fake_apps"],
            ],
            Query(context, "SELECT name FROM sqlite_master WHERE name = 'fake_apps'")
        );
    }

    [Fact]
    public void Open_AFileFromAnotherSchemaVersion_Throws()
    {
        using var context = new FleetTestContext();
        string path = DatabasePath(context);
        using (var connection = new SqliteConnection($"Data Source={path};Pooling=False"))
        {
            connection.Open();
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText =
                "CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT); INSERT INTO meta VALUES ('schema_version', '1');";
            command.ExecuteNonQuery();
        }

        FleetException ex = Assert.Throws<FleetException>(() => AnalysisDatabase.Open(path));

        Assert.Contains("another version of fleet", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ChildProcessExecutor_KeepsOnlyTheEndOfALongOutput()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Runs sh");
        string root = Folder.CreateTemporary();
        try
        {
            var executor = new ChildProcessExecutor(
                ["sh", "-c", "head -c 5000000 /dev/zero | tr '\\0' x >&2; echo END >&2; exit 1"],
                TimeSpan.FromSeconds(30)
            );

            string? failure = await executor.Run(
                new FakeAnalysis(),
                root,
                Path.Join(root, "result"),
                TestContext.Current.CancellationToken
            );

            Assert.NotNull(failure);
            Assert.True(failure.Length < 2200, $"{failure.Length} characters");
            Assert.EndsWith("END", failure, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
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
        AnalysisReport report = await new AnalysisRunner(
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
        return Assert.Single(report.Results);
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

    private static string DatabasePath(FleetTestContext context) => Path.Join(context.Outside, "analysis.sqlite");

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
                : $"CREATE TABLE {Table} (env TEXT, org TEXT, app TEXT, {Column} INTEGER, PRIMARY KEY (env, org, app));";

        public IReadOnlyList<string> AppTables => [Table];

        private string Table => $"{AnalysisDatabase.TablePrefix(this)}apps";

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
            using AppRows rows = recorder.Rows(Table, [Column]);
            rows.Add(int.Parse(File.ReadAllText(resultFile), System.Globalization.CultureInfo.InvariantCulture));
            return null;
        }

        /// <summary>Whether <see cref="Complete"/> says how many apps it has.</summary>
        public bool Summarizes { get; init; } = true;

        public Task<string?> Complete(
            AnalysisDatabase database,
            AnalysisOptions options,
            ISyncObserver? observer,
            CancellationToken cancellationToken
        ) =>
            Task.FromResult(
                Summarizes
                    ? database.Change(
                        this,
                        (connection, transaction) =>
                        {
                            using SqliteCommand count = connection.CreateCommand();
                            count.Transaction = transaction;
                            count.CommandText = $"SELECT count(*) FROM {Table}";
                            return $"{count.ExecuteScalar()} apps recorded";
                        }
                    )
                    : null
            );
    }
}
