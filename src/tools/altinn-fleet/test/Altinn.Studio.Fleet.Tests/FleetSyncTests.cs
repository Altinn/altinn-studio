using System.Net;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Tests;

public sealed class FleetSyncTests
{
    [Fact]
    public async Task FirstSync_ExtractsAndIndexesEachApp()
    {
        using var context = new FleetTestContext();
        string commit = context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "skd", "app-two", "3");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal((2, 0, 2, 0), (result.Deployed, result.Unchanged, result.Added, result.Failures.Count));
        Assert.Equal(
            [
                "App",
                "App/App.csproj",
                "App/config",
                "App/config/applicationmetadata.json",
                "App/views",
                "App/views/Home",
                "App/views/Home/Index.cshtml",
            ],
            Folder.Tree(context.AppPath("ttd", "app-one"))
        );
        Assert.Equal(
            [
                [
                    "ttd",
                    "app-one",
                    "1.0.0",
                    commit,
                    "altinn.studio",
                    "Altinn.App.Api",
                    "8.5.0",
                    "8",
                    "4",
                    "net8.0",
                    "3",
                ],
            ],
            context.Query(
                "SELECT org, app, version, commit_sha, studio_host, altinn_app_package, altinn_app_version, altinn_app_major, "
                    + "frontend_version, target_framework, file_count FROM apps WHERE org = 'ttd'"
            )
        );
        Assert.Equal(
            [
                ["App/App.csproj", "Altinn.App.Api", "8.5.0"],
                ["App/App.csproj", "Altinn.App.Core", "8.5.0"],
            ],
            context.Query("SELECT project, name, version FROM packages WHERE app = 'app-one' ORDER BY name")
        );
        string[] file = context
            .Query("SELECT size, sha256 FROM files WHERE app = 'app-one' AND path = 'App/App.csproj'")
            .Single();
        byte[] content = File.ReadAllBytes(Path.Join(context.AppPath("ttd", "app-one"), "App", "App.csproj"));
        Assert.Equal(
            [
                content.Length.ToString(System.Globalization.CultureInfo.InvariantCulture),
                Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(content)),
            ],
            file
        );
        Assert.True(File.Exists(Path.Join(context.ProdPath, "README.md")));
        Assert.Equal(
            ["README.md", "apps", "index.sqlite"],
            Directory.EnumerateFileSystemEntries(context.ProdPath).Select(Path.GetFileName).Order()
        );
    }

    [Fact]
    public async Task FirstSync_MakesFilesPlainAndKeepsTheirTimes()
    {
        if (OperatingSystem.IsWindows())
        {
            Assert.Skip("Unix file modes");
            return;
        }

        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");

        await context.SyncProd();

        string csproj = Path.Join(context.AppPath("ttd", "app-one"), "App", "App.csproj");
        Assert.Equal(
            UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead | UnixFileMode.OtherRead,
            File.GetUnixFileMode(csproj)
        );
        Assert.Equal(
            UnixFileMode.UserRead
                | UnixFileMode.UserWrite
                | UnixFileMode.UserExecute
                | UnixFileMode.GroupRead
                | UnixFileMode.GroupExecute
                | UnixFileMode.OtherRead
                | UnixFileMode.OtherExecute,
            File.GetUnixFileMode(Path.Join(context.AppPath("ttd", "app-one"), "App"))
        );
        Assert.Equal(new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc), File.GetLastWriteTimeUtc(csproj));
    }

    [Fact]
    public async Task SyncWithoutChanges_TouchesNothingInTheEnvironmentFolder()
    {
        Assert.SkipUnless(OperatingSystem.IsLinux(), "Uses GNU find to read inodes and change times");
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "app-two", "2.0.0");
        context.Altinn.Deploy("prod", "skd", "private", "1");
        context.Altinn.ArchiveStatus[("altinn.studio", FakeAltinn.Commit("altinn.studio/skd/private/1"))] =
            HttpStatusCode.Forbidden;
        await context.SyncProd();
        string before = Folder.Fingerprint(context.ProdPath);
        await Task.Delay(20, TestContext.Current.CancellationToken);
        context.Altinn.ClearRequests();

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal((3, 2, 0, 1), (result.Deployed, result.Unchanged, result.Changes.Count, result.Failures.Count));
        Assert.Equal(before, Folder.Fingerprint(context.ProdPath));
        Assert.Equal(0, context.Altinn.Count("altinn.studio/"));
        Assert.NotNull(context.Store.ReadCheckState(FleetTestContext.Prod));
    }

    [Fact]
    public async Task NewVersion_ReplacesTheAppsFolder()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy(
            "prod",
            "ttd",
            "app-one",
            "1.0.0",
            archive: TarBuilder.App("app-one", "1.0.0").File("old.txt", "old")
        );
        context.Altinn.Deploy("prod", "ttd", "app-two", "1.0.0");
        await context.SyncProd();
        context.Altinn.ClearRequests();

        string commit = context.Altinn.Deploy(
            "prod",
            "ttd",
            "app-one",
            "1.1.0",
            archive: TarBuilder.App("app-one", "1.1.0", "9.0.0").File("new.txt", "new")
        );
        EnvironmentSyncResult result = await context.SyncProd();

        var change = Assert.IsType<AppChange.Updated>(Assert.Single(result.Changes));
        Assert.Equal(("1.0.0", "1.1.0", commit), (change.From?.Value, change.To.Value, change.Commit.Value));
        Assert.Equal(1, result.Unchanged);
        Assert.True(File.Exists(Path.Join(context.AppPath("ttd", "app-one"), "new.txt")));
        Assert.False(File.Exists(Path.Join(context.AppPath("ttd", "app-one"), "old.txt")));
        Assert.Equal(
            [
                ["1.1.0", "9"],
            ],
            context.Query("SELECT version, altinn_app_major FROM apps WHERE app = 'app-one'")
        );
        Assert.Equal(
            [
                ["new.txt"],
            ],
            context.Query("SELECT path FROM files WHERE app = 'app-one' AND path LIKE '%.txt'")
        );
        Assert.Equal(1, context.Altinn.Count("/archive/"));
        Assert.Empty(Directory.EnumerateFileSystemEntries(context.Store.TempPath));
    }

    [Fact]
    public async Task AppThatNoLongerRuns_IsRemovedWithItsEmptyOrgFolder()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "skd", "gone", "1.0.0");
        await context.SyncProd();

        context.Altinn.Deployments[("prod", "skd")].Clear();
        EnvironmentSyncResult result = await context.SyncProd();

        var change = Assert.IsType<AppChange.Removed>(Assert.Single(result.Changes));
        Assert.Equal("1.0.0", change.Version?.Value);
        Assert.False(Directory.Exists(Path.Join(context.Store.AppsPath(FleetTestContext.Prod), "skd")));
        Assert.Empty(context.Query("SELECT * FROM files WHERE org = 'skd'"));
        Assert.Equal(
            [
                ["1"],
            ],
            context.Query("SELECT count(*) FROM apps")
        );
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.OK)]
    [InlineData((HttpStatusCode)0)]
    public async Task FailedDiscovery_KeepsTheOrgsApps(HttpStatusCode status)
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "skd", "kept", "1.0.0");
        await context.SyncProd();

        if (status == HttpStatusCode.OK)
        {
            // An empty list, without kuberneteswrapper itself, comes from something other than the cluster.
            context.Altinn.Deployments[("prod", "skd")].Clear();
            context.Altinn.BrokenClusters[("prod", "skd")] = HttpStatusCode.OK;
        }
        else
        {
            context.Altinn.BrokenClusters[("prod", "skd")] = status;
        }

        EnvironmentSyncResult result = await context.SyncProd();

        OrgFailure failure = Assert.Single(result.DiscoveryFailures);
        Assert.Equal("skd", failure.Org);
        Assert.Empty(result.Changes);
        Assert.True(Directory.Exists(context.AppPath("skd", "kept")));
        Assert.Equal(
            [
                ["skd"],
                ["ttd"],
            ],
            context.Query("SELECT org FROM apps ORDER BY org")
        );
    }

    [Fact]
    public async Task OrgFilter_LeavesOtherOrgsAlone()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "skd", "other", "1.0.0");
        await context.SyncProd(orgs: new HashSet<string> { "ttd" });
        context.Altinn.Deploy("prod", "ttd", "app-two", "1.0.0");

        EnvironmentSyncResult result = await context.SyncProd(orgs: new HashSet<string> { "ttd" });

        Assert.Equal((2, 1, 1), (result.Deployed, result.Unchanged, result.Added));
        Assert.Equal(
            [
                ["ttd", "app-one"],
                ["ttd", "app-two"],
            ],
            context.Query("SELECT org, app FROM apps ORDER BY app")
        );
        Assert.Equal(0, context.Altinn.Count("skd.apps"));
    }

    [Fact]
    public async Task Release_IsLookedUpInStagingAndDevWhenProductionDoesNotHaveIt()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "from-prod", "1");
        context.Altinn.Deploy("prod", "ttd", "from-staging", "1", host: "staging.altinn.studio");
        context.Altinn.Deploy("prod", "ttd", "from-dev", "1", host: "dev.altinn.studio");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(3, result.Added);
        Assert.Equal(
            [
                ["from-dev", "dev.altinn.studio"],
                ["from-prod", "altinn.studio"],
                ["from-staging", "staging.altinn.studio"],
            ],
            context.Query("SELECT app, studio_host FROM apps ORDER BY app")
        );
        Assert.Equal(1, context.Altinn.Count("https://staging.altinn.studio/repos/"));
        Assert.Equal(1, context.Altinn.Count("https://dev.altinn.studio/repos/"));
        Assert.Equal(["altinn.studio", "staging.altinn.studio", "dev.altinn.studio"], context.Credentials.Asked);
    }

    [Fact]
    public async Task Release_IsLookedUpOneAppAtATimeWhereTheLookupIsMissing()
    {
        using var context = new FleetTestContext();
        context.Altinn.HostsWithoutLookup.Add("altinn.studio");
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.Deploy("prod", "ttd", "app-two", "2", host: "staging.altinn.studio");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(2, result.Added);
        Assert.Equal(2, context.Altinn.Count("https://altinn.studio/designer/api/ttd/"));
        Assert.Equal(1, context.Altinn.Count("https://staging.altinn.studio/designer/api/v1/releases/lookup"));
        Assert.Contains(result.Notes, note => note.Contains("one app at a time", StringComparison.Ordinal));
    }

    [Fact]
    public async Task HostWithoutKey_IsSkipped()
    {
        using var context = new FleetTestContext("altinn.studio");
        context.Altinn.Deploy("prod", "ttd", "app-one", "1", host: "staging.altinn.studio");

        EnvironmentSyncResult result = await context.SyncProd();

        AppFailure failure = Assert.Single(result.Failures);
        Assert.Equal(FailureKind.Unavailable, failure.Kind);
        Assert.EndsWith(
            "without a key for staging.altinn.studio and dev.altinn.studio",
            failure.Reason,
            StringComparison.Ordinal
        );
        Assert.Equal(0, context.Altinn.Count("staging.altinn.studio"));
        Assert.Contains(result.Notes, note => note.Contains("staging.altinn.studio", StringComparison.Ordinal));
    }

    [Fact]
    public async Task UnavailableApp_IsRecordedAndOnlyTriedAgainWhenItsVersionChangesOrWhenAsked()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        string commit = context.Altinn.Deploy("prod", "ttd", "private", "1");
        context.Altinn.ArchiveStatus[("altinn.studio", commit)] = HttpStatusCode.NotFound;

        EnvironmentSyncResult first = await context.SyncProd();
        context.Altinn.ClearRequests();
        EnvironmentSyncResult second = await context.SyncProd();
        int requestsWhenUnchanged = context.Altinn.Count("altinn.studio/");
        await context.SyncProd(retryFailed: true);
        int requestsWhenRetried = context.Altinn.Count("altinn.studio/");
        context.Altinn.Deploy("prod", "ttd", "private", "2");
        EnvironmentSyncResult changed = await context.SyncProd();

        Assert.Equal((1, 1), (first.Added, first.Failures.Count));
        Assert.Equal(FailureKind.Unavailable, first.Failures[0].Kind);
        Assert.Contains("404", first.Failures[0].Reason, StringComparison.Ordinal);
        Assert.Equal((0, 1), (second.Changes.Count, second.Failures.Count));
        Assert.Equal(0, requestsWhenUnchanged);
        Assert.Equal(2, requestsWhenRetried);
        Assert.Equal((1, 0), (changed.Added, changed.Failures.Count));
        Assert.Empty(context.Query("SELECT * FROM failures"));
    }

    [Fact]
    public async Task TransientFailure_IsTriedAgainOnTheNextSync()
    {
        using var context = new FleetTestContext();
        string commit = context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.ArchiveStatus[("altinn.studio", commit)] = HttpStatusCode.BadGateway;

        EnvironmentSyncResult first = await context.SyncProd();
        List<string[]> recorded = context.Query("SELECT org, app, kind FROM failures");
        context.Altinn.ArchiveStatus.Clear();
        EnvironmentSyncResult second = await context.SyncProd();

        Assert.Equal(FailureKind.Error, Assert.Single(first.Failures).Kind);
        Assert.Equal(
            [
                ["ttd", "app-one", "error"],
            ],
            recorded
        );
        Assert.Equal(1, second.Added);
        Assert.Empty(second.Failures);
    }

    [Fact]
    public async Task FailureThatRepeats_LeavesTheEnvironmentFolderAsItWas()
    {
        Assert.SkipUnless(OperatingSystem.IsLinux(), "Uses GNU find to read inodes and change times");
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        string commit = context.Altinn.Deploy("prod", "ttd", "app-two", "1");
        context.Altinn.ArchiveStatus[("altinn.studio", commit)] = HttpStatusCode.BadGateway;
        await context.SyncProd();
        string before = Folder.Fingerprint(context.ProdPath);
        await Task.Delay(20, TestContext.Current.CancellationToken);

        EnvironmentSyncResult second = await context.SyncProd();

        Assert.Equal(FailureKind.Error, Assert.Single(second.Failures).Kind);
        Assert.Equal(before, Folder.Fingerprint(context.ProdPath));
    }

    [Fact]
    public async Task BrokenArchive_KeepsThePreviousVersion()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        await context.SyncProd();
        string commit = context.Altinn.Deploy("prod", "ttd", "app-one", "2");
        byte[] archive = context.Altinn.Archives[("altinn.studio", commit)];
        context.Altinn.Archives[("altinn.studio", commit)] = archive[..(archive.Length / 2)];

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Empty(result.Changes);
        Assert.Single(result.Failures);
        Assert.Equal(
            [
                ["1"],
            ],
            context.Query("SELECT version FROM apps")
        );
        Assert.True(File.Exists(Path.Join(context.AppPath("ttd", "app-one"), "App", "App.csproj")));
        Assert.Equal(
            [
                ["ttd", "app-one", "2"],
            ],
            context.Query("SELECT org, app, version FROM failures")
        );
    }

    [Fact]
    public async Task DryRun_WritesNothing()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");

        EnvironmentSyncResult result = await context.SyncProd(dryRun: true);

        Assert.True(result.DryRun);
        Assert.Equal(1, result.Added);
        Assert.Empty(Directory.EnumerateFileSystemEntries(context.Root));
        Assert.Equal(0, context.Altinn.Count("altinn.studio/"));
    }

    [Fact]
    public async Task SecondSync_IsRefusedWhileTheStoreIsLocked()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        using IDisposable held = context.Store.Lock();

        await Assert.ThrowsAsync<FleetException>(() => context.SyncProd());
    }
}
