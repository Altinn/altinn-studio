using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Http;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Tests;

public sealed class ReleaseResolverTests
{
    [Fact]
    public async Task Resolve_SendsTheLookupInBatches()
    {
        var altinn = new FakeAltinn();
        var deployments = new List<AppDeployment>();
        for (int i = 0; i < ReleaseResolver.LookupBatchSize + 1; i++)
        {
            string app = $"app-{i}";
            altinn.Releases.TryAdd("altinn.studio", []);
            altinn.Releases["altinn.studio"][("ttd", app, "1")] = FakeAltinn.Commit(app);
            deployments.Add(
                new AppDeployment(AppIdentifier.Parse("ttd", app), RuntimeEnvironment.Production, AppVersion.Parse("1"))
            );
        }

        using HttpClient http = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, altinn);
        var resolver = new ReleaseResolver(
            http,
            new StudioKeys(new FakeCredentials("altinn.studio")),
            new FleetOptions().StudioHosts,
            4,
            TimeProvider.System
        );

        Resolution resolution = await resolver.Resolve(
            deployments,
            (_, _) => { },
            TestContext.Current.CancellationToken
        );

        Assert.Equal(deployments.Count, resolution.Releases.Count);
        Assert.Empty(resolution.Failures);
        Assert.Equal(2, altinn.Count("/releases/lookup"));
    }

    [Fact]
    public async Task Resolve_WithoutAnyKeyStopsTheSync()
    {
        var altinn = new FakeAltinn();
        using HttpClient http = FleetHttp.CreateClient("test", FleetTestContext.NoDelay, altinn);
        var resolver = new ReleaseResolver(
            http,
            new StudioKeys(new FakeCredentials("none")),
            new FleetOptions().StudioHosts,
            4,
            TimeProvider.System
        );
        AppDeployment deployment = new(
            AppIdentifier.Parse("ttd", "app-one"),
            RuntimeEnvironment.Production,
            AppVersion.Parse("1")
        );

        await Assert.ThrowsAsync<FleetException>(() =>
            resolver.Resolve([deployment], (_, _) => { }, TestContext.Current.CancellationToken)
        );
        Assert.Empty(altinn.Requests);
    }
}
