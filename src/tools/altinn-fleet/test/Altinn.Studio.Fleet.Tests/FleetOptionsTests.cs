using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Sync;

namespace Altinn.Studio.Fleet.Tests;

public sealed class FleetOptionsTests
{
    [Theory]
    [InlineData("prod", "ssb.apps.altinn.no")]
    [InlineData("tt02", "ssb.apps.tt02.altinn.no")]
    [InlineData("at22", "ssb.apps.at22.altinn.cloud")]
    [InlineData("yt01", "ssb.apps.yt01.altinn.cloud")]
    public void AppsHost_DependsOnTheEnvironment(string environment, string expected)
    {
        HostName? host = FleetOptions.AppsHost(ServiceOwnerCode.Parse("ssb"), RuntimeEnvironment.Parse(environment));

        Assert.Equal(expected, host?.Value);
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
