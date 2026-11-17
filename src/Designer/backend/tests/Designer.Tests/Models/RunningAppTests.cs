using System;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Runtime;
using Xunit;

namespace Designer.Tests.Models;

public class RunningAppTests
{
    private static readonly DateTime s_monday = new(2026, 10, 26, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void From_WithABuildId_TellsWhenItsDeployWasPublished()
    {
        var running = Running(version: "8", buildId: "2");

        var app = RunningApp.From(
            running,
            [Deploy("tt02", "8", "1", s_monday), Deploy("tt02", "8", "2", s_monday.AddDays(1))]
        );

        Assert.Equal(Finished(s_monday.AddDays(1)), app.PublishedAt);
    }

    [Fact]
    public void From_WithABuildIdOfAnotherStudioEnvironment_DoesNotFallBackToTheTag()
    {
        var running = Running(version: "8", buildId: "999");

        var app = RunningApp.From(running, [Deploy("tt02", "8", "1", s_monday)]);

        Assert.Null(app.PublishedAt);
    }

    [Fact]
    public void From_WithoutABuildId_TellsWhenTheTagWasLastPublished()
    {
        var running = Running(version: "8", buildId: null);

        var app = RunningApp.From(
            running,
            [
                Deploy("tt02", "8", "1", s_monday),
                Deploy("tt02", "8", "3", s_monday.AddDays(2)),
                Deploy("tt02", "9", "4", s_monday.AddDays(3)),
                Deploy("tt02", "8", "2", s_monday.AddDays(1)),
            ]
        );

        Assert.Equal(Finished(s_monday.AddDays(2)), app.PublishedAt);
    }

    [Fact]
    public void From_LeavesOutDeploysToOtherEnvironmentsAndUndeploys()
    {
        var running = Running(version: "8", buildId: null);
        DeploymentEntity undeploy = Deploy("tt02", "8", "2", s_monday.AddDays(1));
        undeploy.DeploymentType = DeploymentType.Decommission;

        var app = RunningApp.From(running, [Deploy("at22", "8", "1", s_monday), undeploy]);

        Assert.Null(app.PublishedAt);
    }

    private static AppRunState.Running Running(string version, string buildId) =>
        new("tt02", version, buildId, AppStatus.Ready, RestartedAt: null, CanRestart: true);

    private static DateTime Finished(DateTime created) => created.AddMinutes(5);

    private static DeploymentEntity Deploy(string environment, string tag, string buildId, DateTime created) =>
        new()
        {
            EnvName = environment,
            TagName = tag,
            Created = created,
            Build = new BuildEntity { Id = buildId, Finished = Finished(created) },
        };
}
