using System.Reflection;
using Altinn.App.Core.Internal.WorkflowEngine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class PlannerVersionTests
{
    [Theory]
    [InlineData("9.0.0", "9.0.0-preview.10")]
    [InlineData("9.0.0-preview.10", "9.0.0-preview.9")]
    [InlineData("9.0.0-preview.10.dev.3", "9.0.0-preview.10")]
    [InlineData("9.0.0-preview.10.dev.11", "9.0.0-preview.10.dev.3")]
    [InlineData("9.0.1-dev.4", "9.0.0")]
    [InlineData("9.0.1", "9.0.1-dev.4")]
    [InlineData("9.1.0", "9.0.12")]
    [InlineData("10.0.0", "9.12.0")]
    [InlineData("9.0.0-rc.1", "9.0.0-preview.10")]
    [InlineData("9.0.0-preview", "9.0.0-10")]
    [InlineData("9.0.0-preview.123456789012345678901234567890", "9.0.0-preview.99999999999999999999")]
    [InlineData("9.0.1+0123456789ab", "9.0.0")]
    public void IsNewerThan_NewerPlanner_IsNewer(string plannerVersion, string podVersion)
    {
        Assert.True(PlannerVersion.IsNewerThan(plannerVersion, podVersion));
        Assert.False(PlannerVersion.IsNewerThan(podVersion, plannerVersion));
    }

    [Theory]
    [InlineData("9.0.0")]
    [InlineData("9.0.0-preview.10")]
    [InlineData("9.0.0-preview.10.dev.3")]
    public void IsNewerThan_SameVersion_IsNotNewer(string version)
    {
        Assert.False(PlannerVersion.IsNewerThan(version, version));
    }

    [Fact]
    public void IsNewerThan_BuildMetadata_DoesNotOrder()
    {
        Assert.False(PlannerVersion.IsNewerThan("9.0.0+fedcba987654", "9.0.0"));
        Assert.False(PlannerVersion.IsNewerThan("9.0.0", "9.0.0+fedcba987654"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void IsNewerThan_NoStamp_IsNotNewer(string? plannerVersion)
    {
        Assert.False(PlannerVersion.IsNewerThan(plannerVersion, "9.0.0"));
    }

    /// <summary>
    /// Every version that stamps workflows writes one that parses, so a stamp that does not comes from a version this
    /// pod does not know, and the step waits for one that does.
    /// </summary>
    [Theory]
    [InlineData("not-a-version")]
    [InlineData("9.0")]
    [InlineData("9.0.0.0")]
    [InlineData("v9.0.0")]
    [InlineData("09.0.0")]
    [InlineData("9.0.0-")]
    [InlineData("9.0.0-preview..1")]
    [InlineData("9.0.0-preview.01")]
    [InlineData("9.0.0-preview_1")]
    [InlineData("1.0.0 ")]
    public void IsNewerThan_UnparseableStamp_IsNewer(string plannerVersion)
    {
        Assert.True(PlannerVersion.IsNewerThan(plannerVersion, "9.0.0"));
    }

    [Fact]
    public void IsNewerThan_UnparseablePodVersion_Throws()
    {
        Assert.Throws<ArgumentException>(() => PlannerVersion.IsNewerThan("9.0.0", "9.0.0.0"));
    }

    [Fact]
    public void Current_IsThePackageVersionWithoutBuildMetadata()
    {
        string informational = typeof(PlannerVersion)
            .Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!
            .InformationalVersion;

        Assert.Equal(informational.Split('+')[0], PlannerVersion.Current);
        Assert.False(PlannerVersion.IsNewerThan("0.0.0", PlannerVersion.Current));
    }
}
