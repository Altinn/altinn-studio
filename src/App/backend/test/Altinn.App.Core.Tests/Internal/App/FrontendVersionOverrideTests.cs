using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Internal.App;

public class FrontendVersionOverrideTests
{
    [Theory]
    [InlineData("9.0.0")]
    [InlineData("9.0.0-preview.6")]
    [InlineData("4.31.3-preview.1")]
    [InlineData("10.12.300-rc-2.feature-x")]
    public void IsValidVersion_AcceptsVersionNumbers(string version)
    {
        Assert.True(FrontendVersionOverride.IsValidVersion(version));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("9")]
    [InlineData("9.0")]
    [InlineData("v9.0.0")]
    [InlineData("9.0.0-")]
    [InlineData("9.0.0-preview..6")]
    [InlineData("9.0.0 ")]
    [InlineData("9.0.0\n")]
    [InlineData("9.0.0/../../evil")]
    [InlineData("../9.0.0")]
    [InlineData("https://evil.example/x")]
    [InlineData("//evil.example")]
    [InlineData("9.0.0?x=1")]
    [InlineData("9.0.0#x")]
    [InlineData("9.0.0-\"><script>alert(1)</script>")]
    [InlineData("٩.٠.٠")]
    public void IsValidVersion_RejectsAnythingElse(string? version)
    {
        Assert.False(FrontendVersionOverride.IsValidVersion(version));
    }

    [Fact]
    public void IsValidVersion_RejectsTooLongVersions()
    {
        Assert.False(FrontendVersionOverride.IsValidVersion("9.0.0-" + new string('a', 100)));
    }

    [Theory]
    [InlineData(HostingEnvironment.Development)]
    [InlineData(HostingEnvironment.Staging)]
    public void GetAssetBaseUrl_PointsToAppDistInDevelopmentAndTestEnvironments(HostingEnvironment environment)
    {
        Assert.Equal(
            "https://altinn.studio/designer/app-dist/9.0.0-preview.6",
            FrontendVersionOverride.GetAssetBaseUrl("9.0.0-preview.6", environment)
        );
    }

    [Theory]
    [InlineData(HostingEnvironment.Production)]
    [InlineData(HostingEnvironment.Unknown)]
    public void GetAssetBaseUrl_IsOffInProductionAndUnknownEnvironments(HostingEnvironment environment)
    {
        Assert.Null(FrontendVersionOverride.GetAssetBaseUrl("9.0.0-preview.6", environment));
    }

    [Fact]
    public void GetAssetBaseUrl_IgnoresInvalidVersions()
    {
        Assert.Null(FrontendVersionOverride.GetAssetBaseUrl("https://evil.example/x", HostingEnvironment.Staging));
    }
}
