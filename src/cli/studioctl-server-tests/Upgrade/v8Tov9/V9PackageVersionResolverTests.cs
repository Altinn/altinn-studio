using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class V9PackageVersionResolverTests
{
    [Fact]
    public void ResolveLatestTargetVersion_PrefersLatestStableVersion()
    {
        string[] apiVersions = ["9.0.0", "9.0.1", "9.1.0-preview.1"];
        string[] coreVersions = ["9.0.0", "9.0.1", "9.1.0-preview.1"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(
            apiVersions,
            coreVersions,
            9,
            "9.0.0-preview.8"
        );

        Assert.Equal("9.0.1", version);
    }

    [Fact]
    public void ResolveLatestTargetVersion_NoStableVersion_ReturnsLatestCommonPrerelease()
    {
        string[] apiVersions = ["9.0.0-preview.8", "9.0.0-preview.9", "9.0.0-preview.10"];
        string[] coreVersions = ["9.0.0-preview.8", "9.0.0-preview.9"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(
            apiVersions,
            coreVersions,
            9,
            "9.0.0-preview.8"
        );

        Assert.Equal("9.0.0-preview.9", version);
    }

    [Fact]
    public void ResolveLatestTargetVersion_SelectsACommonReleaseAtTheCompatibilityFloor()
    {
        string[] apiVersions = ["9.0.0-preview.7", "9.0.0-preview.8", "9.0.0-preview.9"];
        string[] coreVersions = ["9.0.0-preview.7", "9.0.0-preview.8"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(
            apiVersions,
            coreVersions,
            9,
            "9.0.0-preview.8"
        );

        Assert.Equal("9.0.0-preview.8", version);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void ResolveLatestTargetVersion_RejectsOlderReleasesAndPartialPublication(bool apiPublished)
    {
        string[] apiVersions = apiPublished ? ["9.0.0-preview.7", "9.0.0-preview.8"] : ["9.0.0-preview.7"];
        string[] coreVersions = ["9.0.0-preview.7"];

        var error = Assert.Throws<InvalidOperationException>(() =>
            V9PackageVersionResolver.ResolveLatestTargetVersion(apiVersions, coreVersions, 9, "9.0.0-preview.8")
        );

        Assert.Contains("at least 9.0.0-preview.8", error.Message, StringComparison.Ordinal);
    }
}
