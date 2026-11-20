#nullable enable
using System;
using System.Diagnostics;
using System.Security.Claims;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Quartz;
using Xunit;

namespace Designer.Tests.Telemetry;

public class RootSpanTests
{
    [Fact]
    public void Enrich_AppRepository_SetsServiceOwnerAppAndRepoType()
    {
        using Activity activity = Enrich(new() { ["org"] = "ttd", ["app"] = "my-app" });

        Assert.Equal("ttd", activity.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("my-app", activity.GetTagItem(ServiceTelemetry.Attributes.App));
        Assert.Equal("app", activity.GetTagItem(ServiceTelemetry.Attributes.RepoType));
    }

    [Theory]
    [InlineData("ttd-datamodels", "datamodels")]
    [InlineData("ttd-content", "content")]
    [InlineData("ttd-resources", "resources")]
    public void Enrich_SharedRepository_SetsRepoTypeWithoutApp(string repository, string expectedRepoType)
    {
        using Activity activity = Enrich(new() { ["org"] = "ttd", ["repository"] = repository });

        Assert.Equal(expectedRepoType, activity.GetTagItem(ServiceTelemetry.Attributes.RepoType));
        Assert.Null(activity.GetTagItem(ServiceTelemetry.Attributes.App));
    }

    [Theory]
    [InlineData("my-app-datamodels")]
    [InlineData("forms-content")]
    [InlineData("skd-resources")]
    public void Enrich_AppNamedLikeSharedRepository_IsApp(string app)
    {
        using Activity activity = Enrich(new() { ["org"] = "ttd", ["app"] = app });

        Assert.Equal("app", activity.GetTagItem(ServiceTelemetry.Attributes.RepoType));
        Assert.Equal(app, activity.GetTagItem(ServiceTelemetry.Attributes.App));
    }

    [Fact]
    public void Enrich_RepositoryWithoutServiceOwner_SetsNoRepositoryAttributes()
    {
        using Activity activity = Enrich(new() { ["repository"] = "my-app" });

        Assert.Null(activity.GetTagItem(ServiceTelemetry.Attributes.RepoType));
        Assert.Null(activity.GetTagItem(ServiceTelemetry.Attributes.App));
    }

    [Fact]
    public void Enrich_UppercaseRouteValues_AreLowercased()
    {
        using Activity activity = Enrich(new() { ["orgName"] = "TTD", ["repo"] = "My-App" });

        Assert.Equal("ttd", activity.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("my-app", activity.GetTagItem(ServiceTelemetry.Attributes.App));
    }

    [Theory]
    [InlineData("env", "tt02", "tt02")]
    [InlineData("environment", "at22", "at22")]
    [InlineData("env", "production", "prod")]
    [InlineData("env", "prod", "prod")]
    public void Enrich_EnvironmentRouteValue_SetsRuntimeEnvironmentName(
        string routeKey,
        string environment,
        string expected
    )
    {
        using Activity activity = Enrich(new() { [routeKey] = environment });

        Assert.Equal(expected, activity.GetTagItem(ServiceTelemetry.Attributes.Environment));
    }

    [Fact]
    public void Enrich_AuthenticatedUser_SetsEndUserId()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "testUser")], "Test")),
        };
        using var activity = new Activity("test");

        RootSpan.Enrich(activity, httpContext.Response);

        Assert.Equal("testUser", activity.GetTagItem(ServiceTelemetry.Attributes.EndUserId));
    }

    [Fact]
    public void Enrich_NoRouteValuesOrUser_SetsNothing()
    {
        using Activity activity = Enrich([]);

        Assert.Empty(activity.TagObjects);
    }

    [Fact]
    public void SetTargetEnvironment_SetsRuntimeEnvironmentNameOnRootSpan()
    {
        using var rootSpan = new Activity("root");
        var httpContext = new DefaultHttpContext();
        httpContext.Features.Set<IHttpActivityFeature>(new ActivityFeature(rootSpan));

        httpContext.SetTargetEnvironment("production");

        Assert.Equal("prod", rootSpan.GetTagItem(ServiceTelemetry.Attributes.Environment));
    }

    [Fact]
    public void Enrich_AfterExceptionHandler_UsesRouteValuesItKept()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Features.Set<IExceptionHandlerFeature>(
            new ExceptionHandlerFeature
            {
                Error = new InvalidOperationException(),
                Path = "/designer/api/ttd/my-app/releases",
                RouteValues = new() { ["org"] = "ttd", ["app"] = "my-app" },
            }
        );
        using var activity = new Activity("test");

        RootSpan.Enrich(activity, httpContext.Response);

        Assert.Equal("ttd", activity.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("my-app", activity.GetTagItem(ServiceTelemetry.Attributes.App));
    }

    [Fact]
    public void EnrichJobRun_NamesSpanAfterJobType()
    {
        IJobDetail jobDetail = JobBuilder
            .Create<DeploymentPipelinePollingJob>()
            .WithIdentity("DeploymentPipelinePollingJob-ttd-my-app-12345")
            .Build();
        using var activity = new Activity("Quartz.Job.Execute");
        activity.DisplayName = "execute DeploymentPipelinePollingJob-ttd-my-app-12345";

        RootSpan.EnrichJobRun(activity, "OnStartActivity", jobDetail);

        Assert.Equal("execute DeploymentPipelinePollingJob", activity.DisplayName);
    }

    [Fact]
    public void OfJob_FromWithinJobRun_ReturnsQuartzSpan()
    {
        using Activity jobSpan = new Activity("Quartz.Job.Execute").Start();
        using Activity child = new Activity("child").Start();

        Assert.Same(jobSpan, RootSpan.OfJob());
    }

    [Fact]
    public void OfJob_OutsideJobRun_ReturnsNull()
    {
        using Activity activity = new Activity("GET /designer/api/environments").Start();

        Assert.Null(RootSpan.OfJob());
    }

    private sealed class ActivityFeature(Activity activity) : IHttpActivityFeature
    {
        public Activity Activity { get; set; } = activity;
    }

    private static Activity Enrich(Microsoft.AspNetCore.Routing.RouteValueDictionary routeValues)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.RouteValues = routeValues;
        var activity = new Activity("test");
        RootSpan.Enrich(activity, httpContext.Response);
        return activity;
    }
}
