using System.Reflection;
using Altinn.App.Core.Internal.WorkflowEngine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class AppLibVersionTests
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
    public void IsNewerThan_NewerMinimum_IsNewer(string minAppLibVersion, string podVersion)
    {
        Assert.True(AppLibVersion.IsNewerThan(minAppLibVersion, podVersion));
        Assert.False(AppLibVersion.IsNewerThan(podVersion, minAppLibVersion));
    }

    [Theory]
    [InlineData("9.0.0")]
    [InlineData("9.0.0-preview.10")]
    [InlineData("9.0.0-preview.10.dev.3")]
    public void IsNewerThan_SameVersion_IsNotNewer(string version)
    {
        Assert.False(AppLibVersion.IsNewerThan(version, version));
    }

    [Fact]
    public void IsNewerThan_BuildMetadata_DoesNotOrder()
    {
        Assert.False(AppLibVersion.IsNewerThan("9.0.0+fedcba987654", "9.0.0"));
        Assert.False(AppLibVersion.IsNewerThan("9.0.0", "9.0.0+fedcba987654"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void IsNewerThan_NoStamp_IsNotNewer(string? minAppLibVersion)
    {
        Assert.False(AppLibVersion.IsNewerThan(minAppLibVersion, "9.0.0"));
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
    public void IsNewerThan_UnparseableStamp_IsNewer(string minAppLibVersion)
    {
        Assert.True(AppLibVersion.IsNewerThan(minAppLibVersion, "9.0.0"));
    }

    [Fact]
    public void IsNewerThan_UnparseablePodVersion_Throws()
    {
        Assert.Throws<ArgumentException>(() => AppLibVersion.IsNewerThan("9.0.0", "9.0.0.0"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void MinFor_NothingDeclared_IsThePodVersion(string? compatibleFrom)
    {
        Assert.Equal("9.1.0", AppLibVersion.MinFor("9.1.0", compatibleFrom));
    }

    [Theory]
    [InlineData("9.1.0", "9.0.0")]
    [InlineData("9.1.0", "9.1.0-preview.3")]
    [InlineData("9.1.0", "9.1.0")]
    [InlineData("9.1.0+0123456789ab", "8.12.7")]
    public void MinFor_DeclaredVersionAtOrBelowThePod_IsTheDeclaredVersion(string podVersion, string compatibleFrom)
    {
        Assert.Equal(compatibleFrom, AppLibVersion.MinFor(podVersion, compatibleFrom));
    }

    /// <summary>
    /// A declared version can only lower the minimum. Above the pod's version it would hold back the pod's own
    /// workflows, and one that does not parse would hold back every pod.
    /// </summary>
    [Theory]
    [InlineData("9.0.0", "9.1.0")]
    [InlineData("9.0.0-preview.10", "9.0.0")]
    [InlineData("9.1.0", "not-a-version")]
    [InlineData("9.1.0", "9.0")]
    [InlineData("9.1.0", "v9.0.0")]
    [InlineData("9.1.0", "9.0.0-preview.01")]
    public void MinFor_DeclaredVersionAboveThePodOrUnparseable_IsThePodVersion(string podVersion, string compatibleFrom)
    {
        Assert.Equal(podVersion, AppLibVersion.MinFor(podVersion, compatibleFrom));
    }

    [Fact]
    public void MinFor_UnparseablePodVersion_Throws()
    {
        Assert.Throws<ArgumentException>(() => AppLibVersion.MinFor("9.0.0.0", "9.0.0"));
    }

    [Theory]
    [InlineData("9.0.0", false)]
    [InlineData("9.0.1-preview.1", false)]
    [InlineData("9.0.0-preview.10", true)]
    public void MinFor_LetsAPodAtOrAboveTheDeclaredVersionRunWhatANewerVersionPlanned(string podVersion, bool mustWait)
    {
        string minAppLibVersion = AppLibVersion.MinFor("9.1.0", "9.0.0");

        Assert.Equal(mustWait, AppLibVersion.IsNewerThan(minAppLibVersion, podVersion));
    }

    /// <summary>
    /// A <see cref="AppLibVersion.CompatibleFrom"/> that does not parse, or one above
    /// <see cref="AppLibVersion.Current"/>, would quietly count as none.
    /// </summary>
    [Fact]
    public void CompatibleFrom_TakesEffect()
    {
        string expected = AppLibVersion.CompatibleFrom ?? AppLibVersion.Current;

        Assert.Equal(expected, AppLibVersion.MinForWorkflows);
    }

    /// <summary>
    /// This pod runs the workflows it plans itself.
    /// </summary>
    [Fact]
    public void MinForWorkflows_IsNotNewerThanThisPod()
    {
        Assert.False(AppLibVersion.IsNewerThan(AppLibVersion.MinForWorkflows, AppLibVersion.Current));
    }

    [Fact]
    public void Current_IsThePackageVersionWithoutBuildMetadata()
    {
        string informational = typeof(AppLibVersion)
            .Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!
            .InformationalVersion;

        Assert.Equal(informational.Split('+')[0], AppLibVersion.Current);
        Assert.False(AppLibVersion.IsNewerThan("0.0.0", AppLibVersion.Current));
    }
}
