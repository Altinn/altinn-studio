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
            // sh -c SCRIPT gets the job's arguments as $0, $1 and so on.
            var executor = new ChildProcessExecutor(["sh", "-c", "sleep 20 & exit 3"], TimeSpan.FromSeconds(1));
            var timer = System.Diagnostics.Stopwatch.StartNew();

            string? failure = await executor.Run(
                new AnalysisJob.App("fake", root),
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
    public async Task Run_AnalyzesTheItemsOfAnAnalysisAfterItsApps_AndRecordsThem()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "broken", "2.0.0");
        await context.SyncProd();
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath(context));
        var analysis = new FakeItemAnalysis();
        var plain = new FakeAnalysis { Name = "plain" };
        var progress = new RecordingObserver();

        AnalysisReport report = await new AnalysisRunner(
            context.Store,
            database,
            [analysis, plain],
            new InProcessExecutor([analysis, plain])
        ).Run(
            new AnalysisOptions { Environments = [FleetTestContext.Prod] },
            progress,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(new AnalysisItemsResult("fake", "counts", 3, 2, 1, 1, 4), Assert.Single(report.Items));
        // The items see the apps recorded: one app analyzed, one failed.
        Assert.Equal(
            [
                ["apps", "1"],
            ],
            Query(context, "SELECT item, apps FROM fake_items")
        );
        Assert.Contains(("items", 2, 2), progress.Events);
        Assert.Contains(("apps", 4, 4), progress.Events);
    }

    [Theory]
    [InlineData("app")]
    [InlineData("item")]
    public async Task RunJob_RunsTheJobThatItsArgumentsDescribe(string kind)
    {
        string root = Folder.CreateTemporary();
        try
        {
            string resultFile = Path.Join(root, "result");
            AnalysisJob job =
                kind == "app"
                    ? new AnalysisJob.App("fake", root)
                    : new AnalysisJob.Item("fake", new AnalysisItem("apps", "count"));
            using var error = new StringWriter();

            int exit = await ChildProcessExecutor.RunJob(
                ChildProcessExecutor.Arguments(job, resultFile),
                [new FakeAnalysis { Name = "other" }, new FakeItemAnalysis()],
                error,
                TestContext.Current.CancellationToken
            );

            Assert.Equal((0, ""), (exit, error.ToString()));
            Assert.Equal(kind == "app" ? "0" : "count", File.ReadAllText(resultFile));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Theory]
    [InlineData(1, "item", "fake", "fails", "count", "result")]
    [InlineData(2, "item", "other", "apps", "count", "result")]
    [InlineData(2, "app", "missing", "folder", "result")]
    [InlineData(2, "app", "fake")]
    public async Task RunJob_SaysWhyAJobFailed_OrThatItsArgumentsAreNotAJob(int expected, params string[] arguments)
    {
        using var error = new StringWriter();

        int exit = await ChildProcessExecutor.RunJob(
            arguments,
            [new FakeAnalysis { Name = "other" }, new FakeItemAnalysis()],
            error,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(expected, exit);
        Assert.Contains(
            expected == 1 ? "Fails on purpose." : "Not an analysis job",
            error.ToString(),
            StringComparison.Ordinal
        );
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
            new InProcessExecutor([analysis])
        ).Run(
            new AnalysisOptions { Environments = [FleetTestContext.Prod] },
            null,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(("fake", 1, 1, 0, 0, 0), Counts(Assert.Single(report.Results)));
    }

    [Fact]
    public void Open_WhileAnotherRunHasTheFile_Fails()
    {
        using var context = new FleetTestContext();
        string path = DatabasePath(context);

        using (AnalysisDatabase.Open(path))
        {
            FleetException ex = Assert.Throws<FleetException>(() => AnalysisDatabase.Open(path));
            Assert.Contains("Another fleet analysis is writing", ex.Message, StringComparison.Ordinal);
        }

        using AnalysisDatabase again = AnalysisDatabase.Open(path);
        again.Prepare(new FakeAnalysis());
    }

    [Fact]
    public void Open_AnSqliteFileThatFleetDidNotWrite_LeavesItAsItWas()
    {
        using var context = new FleetTestContext();
        string path = DatabasePath(context);
        using (var connection = new SqliteConnection($"Data Source={path};Pooling=False"))
        {
            connection.Open();
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText = "PRAGMA journal_mode = WAL; CREATE TABLE notes (text TEXT);";
            command.ExecuteNonQuery();
        }

        FleetException ex = Assert.Throws<FleetException>(() => AnalysisDatabase.Open(path));

        Assert.Contains("is not a file that fleet analysis wrote", ex.Message, StringComparison.Ordinal);
        using var check = new SqliteConnection($"Data Source={path};Mode=ReadOnly;Pooling=False");
        check.Open();
        using SqliteCommand tables = check.CreateCommand();
        tables.CommandText = "SELECT group_concat(name) FROM sqlite_master; PRAGMA journal_mode;";
        using SqliteDataReader reader = tables.ExecuteReader();
        Assert.True(reader.Read());
        Assert.Equal("notes", reader.GetString(0));
        Assert.True(reader.NextResult() && reader.Read());
        Assert.Equal("wal", reader.GetString(0));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Run_OfANewVersionForSomeServiceOwnersOrEnvironments_IsRefused(bool someServiceOwners)
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ssb", "app-two", "2.0.0");
        await context.SyncProd();
        await Run(context, new FakeAnalysis());
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath(context));
        var newer = new FakeAnalysis { Version = 2 };

        FleetException ex = await Assert.ThrowsAsync<FleetException>(() =>
            new AnalysisRunner(context.Store, database, [newer], new InProcessExecutor([newer])).Run(
                new AnalysisOptions
                {
                    Environments = someServiceOwners
                        ? [FleetTestContext.Prod]
                        : [Common.Domain.RuntimeEnvironment.TT02],
                    Orgs = someServiceOwners
                        ? new HashSet<Common.Domain.ServiceOwnerCode> { Common.Domain.ServiceOwnerCode.Parse("ttd") }
                        : null,
                },
                null,
                TestContext.Current.CancellationToken
            )
        );

        Assert.Contains("Run it for every service owner, in prod", ex.Message, StringComparison.Ordinal);
        // Nothing was replaced.
        Assert.Equal(
            [
                ["2"],
            ],
            Query(context, "SELECT count(*) FROM fake_apps")
        );
    }

    [Fact]
    public async Task Run_InAGivenWorkFolder_UsesAFolderOfItsOwnThere()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        string work = Path.Join(context.Outside, "work");
        Directory.CreateDirectory(Path.Join(work, "prod", "fake", "ttd", "app-one"));
        File.WriteAllText(Path.Join(work, "prod", "fake", "ttd", "app-one", "theirs.txt"), "");
        var analysis = new FakeAnalysis();
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath(context));

        await new AnalysisRunner(context.Store, database, [analysis], new InProcessExecutor([analysis])).Run(
            new AnalysisOptions { Environments = [FleetTestContext.Prod], WorkFolder = work },
            null,
            TestContext.Current.CancellationToken
        );

        Assert.StartsWith(work + Path.DirectorySeparatorChar, analysis.Folders["app-one"], StringComparison.Ordinal);
        Assert.True(File.Exists(Path.Join(work, "prod", "fake", "ttd", "app-one", "theirs.txt")));
        Assert.Equal(["prod"], Directory.GetDirectories(work).Select(Path.GetFileName));
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
    public async Task ChildProcessExecutor_GivesTheChildCultureData()
    {
        Assert.SkipWhen(OperatingSystem.IsWindows(), "Runs sh");
        string root = Folder.CreateTemporary();
        try
        {
            // sh -c SCRIPT gets the job's arguments as $0, $1 and so on: app, the analysis, the folder, the result.
            var executor = new ChildProcessExecutor(
                ["sh", "-c", "printf %s \"$DOTNET_SYSTEM_GLOBALIZATION_INVARIANT\" > \"$3\""],
                TimeSpan.FromSeconds(30)
            );
            string resultFile = Path.Join(root, "result");

            string? failure = await executor.Run(
                new AnalysisJob.App("fake", root),
                resultFile,
                TestContext.Current.CancellationToken
            );

            Assert.Null(failure);
            Assert.Equal("false", File.ReadAllText(resultFile));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
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
                new AnalysisJob.App("fake", root),
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
            new InProcessExecutor([analysis])
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

    /// <summary>Runs the analyses in this process, and turns what they throw into a failure.</summary>
    private sealed class InProcessExecutor(IReadOnlyList<IAppAnalysis> analyses) : IAnalysisExecutor
    {
        public async Task<string?> Run(AnalysisJob job, string resultFile, CancellationToken cancellationToken)
        {
            IAppAnalysis analysis = analyses.Single(a => a.Name == job.Analysis);
            try
            {
                await (
                    job switch
                    {
                        AnalysisJob.App app => analysis.Analyze(app.AppDir, resultFile, cancellationToken),
                        AnalysisJob.Item item => ((IItemAnalysis)analysis).AnalyzeItem(
                            item.Value,
                            resultFile,
                            cancellationToken
                        ),
                        _ => throw new ArgumentException(job.ToString()),
                    }
                );
                return null;
            }
            catch (InvalidOperationException ex)
            {
                return ex.Message;
            }
        }
    }

    private sealed class RecordingObserver : IAnalysisObserver
    {
        public ConcurrentBag<(string Stage, int Completed, int Total)> Events { get; } = [];

        public void OnAppsProgress(Common.Domain.RuntimeEnvironment environment, int completed, int total) =>
            Events.Add(("apps", completed, total));

        public void OnItemsProgress(string analysis, string items, int completed, int total) =>
            Events.Add(("items", completed, total));
    }

    /// <summary>
    /// Records whether each app's copy has its project, and which folder it was analyzed in. Fails the app named
    /// <c>broken</c>. Named <c>misnamed</c>, it creates a table outside its name.
    /// </summary>
    private class FakeAnalysis : IAppAnalysis
    {
        public string Name { get; init; } = "fake";

        public int Version { get; init; } = 1;

        public string Column { get; init; } = "had_project";

        public virtual string Schema =>
            Name == "misnamed"
                ? "CREATE TABLE elsewhere (env TEXT, org TEXT, app TEXT);"
                : $"CREATE TABLE {Table} (env TEXT, org TEXT, app TEXT, {Column} INTEGER, PRIMARY KEY (env, org, app));";

        public IReadOnlyList<string> AppTables => [Table];

        protected string Table => $"{AnalysisDatabase.TablePrefix(this)}apps";

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
            using TableRows rows = recorder.Rows(Table, [Column]);
            rows.Add(int.Parse(File.ReadAllText(resultFile), System.Globalization.CultureInfo.InvariantCulture));
            return null;
        }
    }

    /// <summary>
    /// A <see cref="FakeAnalysis"/> whose items count the apps it recorded. It plans three items, one of which it has
    /// already, analyzes the other two, of which <c>fails</c> fails, and forgets four that it no longer needs.
    /// </summary>
    private sealed class FakeItemAnalysis : FakeAnalysis, IItemAnalysis
    {
        public override string Schema =>
            base.Schema + "CREATE TABLE fake_items (item TEXT NOT NULL PRIMARY KEY, apps INTEGER NOT NULL);";

        public string ItemsName => "counts";

        public ItemPlan PlanItems(AnalysisTables tables, AnalysisOptions options) =>
            new([new AnalysisItem("apps", "count"), new AnalysisItem("fails", "count")], Total: 3, Removed: 4);

        public Task AnalyzeItem(AnalysisItem item, string resultFile, CancellationToken cancellationToken) =>
            item.Key == "fails"
                ? throw new InvalidOperationException("Fails on purpose.")
                : File.WriteAllTextAsync(resultFile, item.Input, cancellationToken);

        public string? RecordItem(AnalysisTables tables, AnalysisItem item, AnalysisOutcome outcome)
        {
            if (outcome.ResultFile is null)
            {
                return outcome.Failure;
            }

            Assert.Equal("count", File.ReadAllText(outcome.ResultFile));
            tables.Execute(
                $"INSERT INTO fake_items (item, apps) SELECT $item, count(*) FROM {Table}",
                ("$item", item.Key)
            );
            return null;
        }
    }
}
