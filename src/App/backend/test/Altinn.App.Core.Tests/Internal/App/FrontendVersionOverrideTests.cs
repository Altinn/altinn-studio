using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Internal.App;

public class FrontendVersionOverrideTests
{
    [Theory]
    [InlineData("9.0.0-preview.6")]
    [InlineData("9.0.0-pr.4513.4073-display-uneditable-columns-in-summary-rep-group.bc613714")]
    public void IsValidVersion_AcceptsVersionNames(string version)
    {
        Assert.True(FrontendVersionOverride.IsValidVersion(version));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("https://evil.example/x")]
    [InlineData("../9.0.0")]
    [InlineData("9.0.0\"><script>alert(1)</script>")]
    [InlineData("9.0.0\n")]
    public void IsValidVersion_RejectsWhatCouldLeaveTheVersionDirectory(string? version)
    {
        Assert.False(FrontendVersionOverride.IsValidVersion(version));
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
}
