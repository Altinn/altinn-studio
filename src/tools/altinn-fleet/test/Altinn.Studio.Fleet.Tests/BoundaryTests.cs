using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Sync;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Tests;

/// <summary>What the sync does with data from outside that does not parse.</summary>
public sealed class BoundaryTests
{
    [Fact]
    public async Task ReleaseWithoutACommitSha_IsRecordedAndNeverBecomesAUrl()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.Deploy("prod", "ttd", "app-two", "1");
        context.Altinn.Releases["altinn.studio"][("ttd", "app-two", "1")] = "../../../../etc/passwd";

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(1, result.Added);
        AppFailure failure = Assert.Single(result.Failures);
        Assert.Equal(("app-two", FailureKind.Error), (failure.App.App.Value, failure.Kind));
        Assert.Contains("without a commit SHA", failure.Reason, StringComparison.Ordinal);
        Assert.Equal(1, context.Altinn.Count("/archive/"));
        Assert.DoesNotContain(context.Altinn.Requests, r => r.Contains("passwd", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RegistryEntriesThatDoNotParse_AreNotedAndTheRestIsSynced()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.Orgs["ttd"] = [.. context.Altinn.Orgs["ttd"], "prodution"];
        context.Altinn.Orgs["Not-A-Code"] = ["production"];

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal((1, 1), (result.Deployed, result.Added));
        Assert.Contains(
            result.Notes,
            n => n.Contains("'Not-A-Code', which is not a service owner code", StringComparison.Ordinal)
        );
        Assert.Contains(
            result.Notes,
            n => n.Contains("'prodution' for ttd, which is not an environment", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task EntryThatIsNotAnAppVersion_IsNotedAndTheRestIsSynced()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        context.Altinn.Deployments[("prod", "ttd")]["App_Two"] = "1";
        context.Altinn.Deployments[("prod", "ttd")]["app-three"] = "1/0";

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal((1, 1), (result.Deployed, result.Added));
        Assert.Equal(
            2,
            result.Notes.Count(n => n.Contains("which is not an app and a version", StringComparison.Ordinal))
        );
    }

    [Theory]
    [InlineData("ssb", "ssb-ra0040-01", "ra0040-01")]
    [InlineData("ttd", "ttd-apps-test-prod", "apps-test-prod")]
    [InlineData("ttd", "kuberneteswrapper", null)]
    [InlineData("ttd", "ttd-", null)]
    [InlineData("ttd", "ttdx-app", null)]
    [InlineData("ttd", "skd-app", null)]
    [InlineData("ttd", null, null)]
    public void HelmRelease_IsTheAppNameAfterItsServiceOwner(string org, string? release, string? expectedApp)
    {
        ServiceOwnerCode owner = ServiceOwnerCode.Parse(org);

        bool parsed = Discovery.TryParseHelmRelease(owner, release, out AppIdentifier app);

        Assert.Equal(expectedApp is not null, parsed);
        Assert.Equal(expectedApp, parsed ? app.App.Value : null);
        Assert.Equal(parsed ? new AppIdentifier(owner, AppName.Parse(expectedApp!)) : default, app);
    }

    [Fact]
    public async Task IndexRowsThatDoNotParse_AreFetchedOrTriedAgain()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1");
        string failing = context.Altinn.Deploy("prod", "ttd", "private", "1");
        context.Altinn.ArchiveStatus[("altinn.studio", failing)] = System.Net.HttpStatusCode.Forbidden;
        await context.SyncProd();
        using (
            var connection = new SqliteConnection(
                $"Data Source={context.Store.IndexPath(FleetTestContext.Prod)};Pooling=False"
            )
        )
        {
            connection.Open();
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText =
                "UPDATE apps SET commit_sha = 'not a sha'; UPDATE failures SET kind = 'from-the-future';";
            command.ExecuteNonQuery();
        }

        context.Altinn.ClearRequests();
        EnvironmentSyncResult result = await context.SyncProd();

        Assert.IsType<AppChange.Updated>(Assert.Single(result.Changes));
        Assert.Equal(2, context.Altinn.Count("/archive/"));
        Assert.Equal(
            [
                ["private", "unavailable"],
            ],
            context.Query("SELECT app, kind FROM failures")
        );
        Assert.Equal(
            [
                [FakeAltinn.Commit("altinn.studio/ttd/app-one/1")],
            ],
            context.Query("SELECT commit_sha FROM apps WHERE app = 'app-one'")
        );
    }
}
