using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Tests;

public sealed class FleetOptionsTests
{
    [Fact]
    public async Task Sync_AsksEachServiceOwnerAtTheHostTheEnvironmentRegistryGives()
    {
        using var context = new FleetTestContext();
        context.Altinn.Environments["production"] = "prod.altinn.no";
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(1, result.Added);
        Assert.Equal(1, context.Altinn.Count("https://ttd.apps.prod.altinn.no/kuberneteswrapper/"));
        Assert.Equal(0, context.Altinn.Count("https://ttd.apps.altinn.no/"));
    }

    [Fact]
    public async Task Sync_MakesTheHostByTheGivenPattern()
    {
        using var context = new FleetTestContext(
            new FleetOptions { AppsHostPattern = "{org}.{appPrefix}.prod.{hostname}" }
        );
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Equal(1, result.Added);
        Assert.Equal(1, context.Altinn.Count("https://ttd.apps.prod.altinn.no/kuberneteswrapper/"));
    }

    [Fact]
    public async Task Sync_WithAnEnvironmentTheRegistryDoesNotList_KeepsTheAppsAndSaysWhy()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        context.Altinn.Environments.Remove("production");

        EnvironmentSyncResult result = await context.SyncProd();

        OrgFailure failure = Assert.Single(result.DiscoveryFailures);
        Assert.Equal(("ttd", "the environment registry does not list production"), (failure.Org, failure.Reason));
        Assert.Empty(result.Changes);
        Assert.True(Directory.Exists(context.AppPath("ttd", "app-one")));
    }

    [Fact]
    public async Task Sync_WithoutEnvironments_Fails()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Environments.Clear();

        FleetException ex = await Assert.ThrowsAsync<FleetException>(() => context.SyncProd());

        Assert.Equal("https://altinncdn.no/config/environments.json lists no environments.", ex.Message);
    }

    [Fact]
    public async Task Sync_AsksOnlyTheGivenStudioInstallations()
    {
        using var context = new FleetTestContext(
            new FleetOptions { StudioHosts = [new FleetOptions().StudioHosts[0]] }
        );
        context.Altinn.Deploy("prod", "ttd", "app-one", "1", host: "staging.altinn.studio");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Single(result.Failures);
        Assert.Equal(["altinn.studio"], context.Credentials.Asked);
        Assert.Equal(0, context.Altinn.Count("staging.altinn.studio"));
    }
}
