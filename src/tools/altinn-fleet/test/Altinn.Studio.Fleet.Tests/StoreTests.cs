using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Store;
using Altinn.Studio.Fleet.Sync;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Tests;

public sealed class StoreTests
{
    [Fact]
    public async Task InterruptedCommit_IsFinishedByTheNextSync()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy(
            "prod",
            "ttd",
            "app-one",
            "1",
            archive: TarBuilder.App("app-one", "1").File("v1.txt", "1")
        );
        context.Altinn.Deploy("prod", "ttd", "removed", "1");
        await context.SyncProd();

        // A run staged version 2 and wrote its journal, then died before it moved anything.
        string run = Path.Join(context.Store.TempPath, "prod-interrupted");
        string staged = Path.Join(run, "stage", "ttd", "app-one");
        Directory.CreateDirectory(staged);
        await File.WriteAllTextAsync(Path.Join(staged, "v2.txt"), "2", TestContext.Current.CancellationToken);
        DateTimeOffset now = DateTimeOffset.UtcNow;
        context.Store.WriteJournal(
            FleetTestContext.Prod,
            new CommitJournal(
                run,
                [
                    new JournalPut(
                        "ttd",
                        "app-one",
                        "2",
                        new string('a', 40),
                        "altinn.studio",
                        now,
                        now,
                        staged,
                        [new SkippedEntry("link", "a symbolic link")]
                    ),
                ],
                [new JournalRemove("ttd", "removed")]
            )
        );
        context.Altinn.Deploy("prod", "ttd", "app-one", "2");
        context.Altinn.Deployments[("prod", "ttd")].Remove("removed");
        context.Altinn.ClearRequests();

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(["v2.txt"], Folder.Tree(context.AppPath("ttd", "app-one")));
        Assert.False(Directory.Exists(context.AppPath("ttd", "removed")));
        Assert.Equal(
            [
                ["app-one", "2", new string('a', 40)],
            ],
            context.Query("SELECT app, version, commit_sha FROM apps")
        );
        Assert.Equal(
            [
                ["link"],
            ],
            context.Query("SELECT path FROM skipped")
        );
        Assert.Empty(result.Changes);
        Assert.Equal(0, context.Altinn.Count("/archive/"));
        Assert.False(File.Exists(context.Store.JournalPath(FleetTestContext.Prod)));
        Assert.False(Directory.Exists(run));
    }

    [Fact]
    public async Task MovedButUnindexedApp_IsIndexedFromTheJournal()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        await context.SyncProd();

        // The run moved version 2 in, but died before the index transaction.
        string target = context.AppPath("ttd", "app-one");
        Directory.Delete(target, recursive: true);
        Directory.CreateDirectory(target);
        await File.WriteAllTextAsync(Path.Join(target, "v2.txt"), "2", TestContext.Current.CancellationToken);
        string run = Path.Join(context.Store.TempPath, "prod-interrupted");
        DateTimeOffset now = DateTimeOffset.UtcNow;
        context.Store.WriteJournal(
            FleetTestContext.Prod,
            new CommitJournal(
                run,
                [
                    new JournalPut(
                        "ttd",
                        "app-one",
                        "2",
                        new string('b', 40),
                        "altinn.studio",
                        now,
                        now,
                        Path.Join(run, "gone"),
                        []
                    ),
                ],
                []
            )
        );

        await context.Sync.RebuildIndex(FleetTestContext.Prod, 2, null, TestContext.Current.CancellationToken);

        Assert.Equal(
            [
                ["2", "1"],
            ],
            context.Query("SELECT version, file_count FROM apps")
        );
    }

    [Fact]
    public async Task Rebuild_KeepsVersionsAndFailuresAndReadsTheFilesAgain()
    {
        using var context = new FleetTestContext();
        string commit = context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        string failing = context.Altinn.Deploy("prod", "ttd", "private", "1");
        context.Altinn.ArchiveStatus[("altinn.studio", failing)] = System.Net.HttpStatusCode.Forbidden;
        await context.SyncProd();
        File.WriteAllText(Path.Join(context.AppPath("ttd", "app-one"), "added.txt"), "x");

        int apps = await context.Sync.RebuildIndex(
            FleetTestContext.Prod,
            2,
            null,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(1, apps);
        Assert.Equal(
            [
                ["1", commit, "4"],
            ],
            context.Query("SELECT version, commit_sha, file_count FROM apps")
        );
        Assert.Equal(
            [
                ["private", "unavailable"],
            ],
            context.Query("SELECT app, kind FROM failures")
        );
    }

    [Fact]
    public async Task OlderSchema_IsRebuiltFromDiskWithoutDownloading()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        await context.SyncProd();
        using (
            var connection = new SqliteConnection(
                $"Data Source={context.Store.IndexPath(FleetTestContext.Prod)};Pooling=False"
            )
        )
        {
            connection.Open();
            using SqliteCommand command = connection.CreateCommand();
            // As schema version 1 left it, before apps had altinn_app_unknown.
            command.CommandText =
                "UPDATE meta SET value = '1' WHERE key = 'schema_version'; DELETE FROM files; "
                + "ALTER TABLE apps DROP COLUMN altinn_app_unknown;";
            command.ExecuteNonQuery();
        }

        context.Altinn.ClearRequests();
        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(1, result.Unchanged);
        Assert.Equal(0, context.Altinn.Count("/archive/"));
        Assert.Equal(
            [
                [FleetIndex.SchemaVersion.ToString(System.Globalization.CultureInfo.InvariantCulture), "3"],
            ],
            context.Query("SELECT (SELECT value FROM meta WHERE key = 'schema_version'), count(*) FROM files")
        );
        Assert.Equal(
            [
                ["1", "8", "NULL"],
            ],
            context.Query("SELECT version, altinn_app_major, altinn_app_unknown FROM apps")
        );
    }

    [Fact]
    public async Task Index_SaysWhichAppsHaveNoKnownAltinnAppVersionAndWhy()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "known", "1");
        context.Altinn.Deploy(
            "prod",
            "ttd",
            "wrapped",
            "1",
            archive: new TarBuilder("wrapped")
                .File(
                    "App/App.csproj",
                    "<Project><ItemGroup><PackageReference Include=\"Wrapper.AltinnApps\" Version=\"1.7.5\" /></ItemGroup></Project>"
                )
                .File(
                    "App/views/Home/Index.cshtml",
                    "<script src=\"https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js\"></script>"
                )
        );
        context.Altinn.Deploy(
            "prod",
            "ttd",
            "ranged",
            "1",
            archive: new TarBuilder("ranged").File(
                "App/App.csproj",
                "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"[8.0.0,9.0.0)\" /></ItemGroup></Project>"
            )
        );
        context.Altinn.Deploy("prod", "ttd", "app-v9", "1", archive: TarBuilder.App("app-v9", "1", "9.0.0"));
        context.Altinn.Deploy(
            "prod",
            "ttd",
            "half-upgraded",
            "1",
            archive: TarBuilder.App("half-upgraded", "1", "9.0.0").File(TarBuilder.IndexPath, TarBuilder.IndexPage)
        );

        await context.SyncProd();

        Assert.Equal(
            [
                ["app-v9", "Altinn.App.Api", "9.0.0", "9", "NULL", "NULL"],
                ["half-upgraded", "Altinn.App.Api", "9.0.0", "NULL", "inconsistent", "4"],
                ["known", "Altinn.App.Api", "8.5.0", "8", "NULL", "4"],
                ["ranged", "Altinn.App.Api", "[8.0.0,9.0.0)", "NULL", "no-major-version", "NULL"],
                ["wrapped", "NULL", "NULL", "NULL", "v8-by-frontend", "4"],
            ],
            context.Query(
                "SELECT app, altinn_app_package, altinn_app_version, altinn_app_major, altinn_app_unknown, frontend_version "
                    + "FROM apps ORDER BY app"
            )
        );
    }

    [Fact]
    public async Task MissingAppFolder_IsFetchedAgain()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        await context.SyncProd();
        Directory.Delete(context.AppPath("ttd", "app-one"), recursive: true);

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.IsType<AppChange.Updated>(Assert.Single(result.Changes));
        Assert.True(Directory.Exists(context.AppPath("ttd", "app-one")));
    }

    [Fact]
    public async Task QueryConnection_CannotChangeTheIndex()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        await context.SyncProd();

        Assert.Throws<SqliteException>(() => context.Query("DELETE FROM apps"));
        Assert.Equal(
            [
                ["1"],
            ],
            context.Query("SELECT count(*) FROM apps")
        );
    }

    [Fact]
    public async Task QueryConnection_JoinsEnvironmentsByName()
    {
        Assert.SkipUnless(OperatingSystem.IsLinux(), "Uses GNU find to read inodes and change times");
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1", archive: TarBuilder.App("app-one", "1", "8.5.0"));
        context.Altinn.Deploy("tt02", "ttd", "app-one", "2", archive: TarBuilder.App("app-one", "2", "9.0.0"));
        context.Altinn.Deploy("tt02", "ttd", "test-only", "1");
        await context.Sync.Sync(
            new SyncOptions
            {
                Environments = [RuntimeEnvironment.Production, RuntimeEnvironment.TT02],
                Parallelism = 2,
            },
            null,
            TestContext.Current.CancellationToken
        );
        string before = Folder.Fingerprint(context.Root);

        List<string[]> joined = context.Query(
            "SELECT p.app, p.altinn_app_major, t.altinn_app_major FROM prod.apps p JOIN tt02.apps t USING (org, app)"
        );
        List<string[]> unqualified = context.Query("SELECT count(*) FROM apps");
        List<string[]> fromTt02 = context.Query("SELECT count(*) FROM tt02.apps");

        Assert.Equal(
            [
                ["app-one", "8", "9"],
            ],
            joined
        );
        Assert.Equal(
            [
                ["1"],
            ],
            unqualified
        );
        Assert.Equal(
            [
                ["2"],
            ],
            fromTt02
        );
        Assert.Throws<SqliteException>(() => context.Query("DELETE FROM tt02.apps"));
        Assert.Throws<SqliteException>(() => context.Query("CREATE TABLE tt02.x (y)"));
        Assert.Equal(before, Folder.Fingerprint(context.Root));
    }

    [Fact]
    [System.Runtime.Versioning.SupportedOSPlatform("linux")]
    public async Task QueryConnection_WorksOnAReadOnlyCopy()
    {
        Assert.SkipUnless(OperatingSystem.IsLinux(), "Uses Unix file modes to make the copy read-only");
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.Deploy("tt02", "ttd", "app-one", "1");
        await context.Sync.Sync(
            new SyncOptions
            {
                Environments = [RuntimeEnvironment.Production, RuntimeEnvironment.TT02],
                Parallelism = 2,
            },
            null,
            TestContext.Current.CancellationToken
        );

        // As in an Agent: each environment's folder is a read-only mount, beside each other, without .fleet.
        string copy = Path.Join(context.Root, "copy");
        foreach (string environment in (string[])["prod", "tt02"])
        {
            string folder = Path.Join(copy, environment);
            Directory.CreateDirectory(folder);
            File.Copy(Path.Join(context.Root, environment, "index.sqlite"), Path.Join(folder, "index.sqlite"));
            File.SetUnixFileMode(Path.Join(folder, "index.sqlite"), UnixFileMode.UserRead);
            File.SetUnixFileMode(folder, UnixFileMode.UserRead | UnixFileMode.UserExecute);
        }

        try
        {
            string before = Folder.Fingerprint(copy);
            using SqliteConnection connection = FleetStoreReader.OpenForQueries(
                new FleetStore(copy),
                RuntimeEnvironment.TT02
            );
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText = "SELECT count(*) FROM prod.apps p JOIN apps t USING (org, app)";

            Assert.Equal(1L, command.ExecuteScalar());
            Assert.Equal(before, Folder.Fingerprint(copy));
        }
        finally
        {
            foreach (string environment in (string[])["prod", "tt02"])
            {
                File.SetUnixFileMode(Path.Join(copy, environment), (UnixFileMode)0b111_101_101);
            }
        }
    }

    [Fact]
    public async Task Status_ReadsTheIndexAndTheLastCheck()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.Deploy("prod", "skd", "app-two", "1");
        context.Altinn.Orgs["broken"] = ["production"];
        await context.SyncProd();

        var status = Assert.IsType<EnvironmentStatus.Synced>(
            FleetStoreReader.GetStatus(context.Store, FleetTestContext.Prod)
        );
        EnvironmentStatus tt02 = FleetStoreReader.GetStatus(context.Store, RuntimeEnvironment.TT02);

        Assert.Equal(
            (2L, 2L, 0L, FleetIndex.SchemaVersion),
            (status.Apps, status.Orgs, status.Failures, status.SchemaVersion)
        );
        Assert.NotNull(status.LastContentChange);
        Assert.Equal("broken", Assert.Single(Assert.IsType<CheckState>(status.LastCheck).DiscoveryFailures).Org);
        Assert.IsType<EnvironmentStatus.NotSynced>(tt02);
    }
}
