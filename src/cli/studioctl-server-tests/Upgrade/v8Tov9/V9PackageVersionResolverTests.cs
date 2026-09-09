using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class V9PackageVersionResolverTests
{
    [Fact]
    public void ResolveLatestTargetVersion_PrefersLatestStableVersion()
    {
        string[] apiVersions = ["9.0.0", "9.0.1", "9.1.0-preview.1"];
        string[] coreVersions = ["9.0.0", "9.0.1", "9.1.0-preview.1"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(apiVersions, coreVersions, 9);

        Assert.Equal("9.0.1", version);
    }

    [Fact]
    public void ResolveLatestTargetVersion_NoStableVersion_ReturnsLatestCommonPrerelease()
    {
        string[] apiVersions = ["9.0.0-preview.1", "9.0.0-preview.2", "9.0.0-preview.3"];
        string[] coreVersions = ["9.0.0-preview.1", "9.0.0-preview.2"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(apiVersions, coreVersions, 9);

        Assert.Equal("9.0.0-preview.2", version);
    }
}
