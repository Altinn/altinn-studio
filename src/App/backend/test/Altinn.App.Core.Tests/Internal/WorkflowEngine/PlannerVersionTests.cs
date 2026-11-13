using System.Reflection;
using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

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

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void Floor_NoDeclaredVersion_IsThePlannerVersion(string? runnableFromVersion)
    {
        Assert.Equal("9.1.0", PlannerVersion.Floor("9.1.0", runnableFromVersion));
    }

    [Theory]
    [InlineData("9.1.0", "9.0.0")]
    [InlineData("9.1.0", "9.1.0-preview.3")]
    [InlineData("9.1.0", "9.1.0")]
    [InlineData("9.1.0+0123456789ab", "8.12.7")]
    public void Floor_DeclaredVersionAtOrBelowThePlanner_IsTheDeclaredVersion(
        string plannerVersion,
        string runnableFromVersion
    )
    {
        Assert.Equal(runnableFromVersion, PlannerVersion.Floor(plannerVersion, runnableFromVersion));
    }

    /// <summary>
    /// A declared version can only lower the floor. Above the planner's version it would hold back the planner's own
    /// pods, so it counts as the planner's version.
    /// </summary>
    [Theory]
    [InlineData("9.0.0", "9.1.0")]
    [InlineData("9.0.0-preview.10", "9.0.0")]
    public void Floor_DeclaredVersionAboveThePlanner_IsThePlannerVersion(
        string plannerVersion,
        string runnableFromVersion
    )
    {
        Assert.Equal(plannerVersion, PlannerVersion.Floor(plannerVersion, runnableFromVersion));
    }

    [Theory]
    [InlineData("not-a-version")]
    [InlineData("9.0")]
    [InlineData("v9.0.0")]
    [InlineData("9.0.0-preview.01")]
    public void Floor_UnparseableDeclaredVersion_IsThePlannerVersion(string runnableFromVersion)
    {
        Assert.Equal("9.1.0", PlannerVersion.Floor("9.1.0", runnableFromVersion));
    }

    /// <summary>
    /// A planner version this pod cannot read comes from a version it does not know, so a declared version that it can
    /// read is below it.
    /// </summary>
    [Fact]
    public void Floor_UnparseablePlannerVersion_IsTheDeclaredVersion()
    {
        Assert.Equal("9.0.0", PlannerVersion.Floor("not-a-version", "9.0.0"));
    }

    /// <summary>
    /// A workflow planned before the stamp existed runs on any version. A declared version cannot raise that.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Floor_NoPlannerVersion_IsNone(string? plannerVersion)
    {
        Assert.False(PlannerVersion.IsNewerThan(PlannerVersion.Floor(plannerVersion, "999.0.0"), "9.0.0"));
    }

    [Theory]
    [InlineData("9.0.0", false)]
    [InlineData("9.0.1-preview.1", false)]
    [InlineData("9.0.0-preview.10", true)]
    public void Floor_LetsAPodAtOrAboveItRunWhatANewerVersionPlanned(string podVersion, bool mustWait)
    {
        string? floor = PlannerVersion.Floor("9.1.0", "9.0.0");

        Assert.Equal(mustWait, PlannerVersion.IsNewerThan(floor, podVersion));
    }

    /// <summary>
    /// A declared floor that does not parse, or one above <see cref="PlannerVersion.Current"/>, would quietly count as
    /// none.
    /// </summary>
    [Fact]
    public void RunnableFrom_TakesEffect()
    {
        string expected = PlannerVersion.RunnableFrom ?? PlannerVersion.Current;

        Assert.Equal(expected, PlannerVersion.Floor(PlannerVersion.Current, PlannerVersion.RunnableFrom));
    }

    [Fact]
    public void RunnableFromVersion_Unset_IsLeftOutOfTheContext()
    {
        var context = new AppWorkflowContext
        {
            Actor = new Actor { UserId = 42 },
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 500000,
            InstanceGuid = Guid.NewGuid(),
            CallbackToken = "test-callback-token",
            PlannerVersion = PlannerVersion.Current,
            RunnableFromVersion = null,
        };

        JsonElement json = JsonSerializer.SerializeToElement(context);

        Assert.Equal(PlannerVersion.Current, json.GetProperty("plannerVersion").GetString());
        Assert.False(json.TryGetProperty("runnableFromVersion", out _));
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
