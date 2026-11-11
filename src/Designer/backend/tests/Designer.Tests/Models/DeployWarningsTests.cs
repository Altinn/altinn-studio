#nullable enable
using Altinn.Studio.Designer.Models;
using NuGet.Versioning;
using Xunit;

namespace Designer.Tests.Models;

public class DeployWarningsTests
{
    private const DeployWarning Upgrade = DeployWarning.UpgradeToV9;
    private const DeployWarning Rollback = DeployWarning.RollbackFromV9;
    private const DeployWarning Prerelease = DeployWarning.PrereleaseToProduction;

    // The release version as App.csproj states it, the environment version as the running app reports it, and
    // whether the environment is production. Null is a version that could not be read.
    public static TheoryData<string?, string?, bool, DeployWarning[]> Combinations =>
        new()
        {
            { null, null, false, [] },
            { null, null, true, [] },
            { null, "8.7.2.0", false, [] },
            { null, "8.7.2.0", true, [] },
            { null, "9.0.0.0", false, [] },
            { null, "9.0.0.0", true, [] },
            { "8.7.2", null, false, [] },
            { "8.7.2", null, true, [] },
            { "8.7.2", "8.6.0.0", false, [] },
            { "8.7.2", "8.6.0.0", true, [] },
            { "8.7.2", "9.0.0.0", false, [Rollback] },
            { "8.7.2", "9.0.0.0", true, [Rollback] },
            { "9.0.0", null, false, [] },
            { "9.0.0", null, true, [] },
            { "9.0.0", "8.7.2.0", false, [Upgrade] },
            { "9.0.0", "8.7.2.0", true, [Upgrade] },
            { "9.1.0", "9.0.0.0", false, [] },
            { "9.1.0", "9.0.0.0", true, [] },
            { "9.0.0-preview.10", null, false, [] },
            { "9.0.0-preview.10", null, true, [Prerelease] },
            { "9.0.0-preview.10", "8.7.2.0", false, [Upgrade] },
            { "9.0.0-preview.10", "8.7.2.0", true, [Upgrade, Prerelease] },
            { "9.0.0-preview.10", "9.0.0.0", false, [] },
            { "9.0.0-preview.10", "9.0.0.0", true, [Prerelease] },
            // The boundary is where the workflow engine comes in, not the majors on either side of it.
            { "7.15.1", "9.0.0.0", true, [Rollback] },
            { "10.0.0", "8.7.2.0", true, [Upgrade] },
            { "10.0.0", "9.0.0.0", true, [] },
            { "8.0.0-preview.3", "8.7.2.0", true, [Prerelease] },
        };

    [Theory]
    [MemberData(nameof(Combinations))]
    public void For_ComparesReleaseWithEnvironment(
        string? releaseVersion,
        string? environmentVersion,
        bool toProduction,
        DeployWarning[] expected
    )
    {
        DeployWarnings warnings = DeployWarnings.For(Parse(releaseVersion), Parse(environmentVersion), toProduction);

        Assert.Equal(expected, warnings.Warnings);
    }

    [Fact]
    public void For_ShowsTheReleaseVersionInFullAndTheEnvironmentVersionWithoutItsFourthPart()
    {
        DeployWarnings warnings = DeployWarnings.For(Parse("9.0.0-preview.10"), Parse("8.7.2.15"), false);

        Assert.Equal("9.0.0-preview.10", warnings.ReleaseAppLibVersion);
        Assert.Equal("8.7.2", warnings.EnvironmentAppLibVersion);
    }

    [Fact]
    public void For_LeavesUnknownVersionsOut()
    {
        DeployWarnings warnings = DeployWarnings.For(null, null, true);

        Assert.Null(warnings.ReleaseAppLibVersion);
        Assert.Null(warnings.EnvironmentAppLibVersion);
    }

    private static NuGetVersion? Parse(string? version) => version is null ? null : NuGetVersion.Parse(version);
}
