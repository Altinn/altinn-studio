using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class AppInactivityUndeployPerOrgJobTests
{
    private static readonly DateTimeOffset s_now = new(2026, 10, 15, 0, 0, 0, TimeSpan.Zero);

    private readonly Mock<IAppInactivityUndeployService> _inactivityUndeployService = new();
    private readonly Mock<IAppInactivityUndeployJobQueue> _jobQueue = new();
    private readonly Mock<IDeploymentRepository> _deploymentRepository = new();
    private readonly List<string> _queuedApps = [];

    private readonly SchedulingSettings _schedulingSettings = new()
    {
        InactivityUndeploy = new InactivityUndeployEnforcementSettings
        {
            Mode = InactivityUndeployMode.DryRun,
            EnforcedOrgs = ["ttd"],
            MaxUndeploysPerDay = 50,
        },
    };

    public AppInactivityUndeployPerOrgJobTests()
    {
        _jobQueue
            .Setup(q =>
                q.QueuePerAppUndeployJobAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string, int, CancellationToken>((_, app, _, _, _) => _queuedApps.Add(app))
            .ReturnsAsync(true);
    }

    [Fact]
    public async Task Execute_WithoutEnvironmentFilter_ShouldPassNullToService()
    {
        SetupCandidates("ttd");

        await CreateJob().Execute(CreateContext("ttd"));

        _inactivityUndeployService.Verify(
            x =>
                x.GetAppsForDecommissioningAsync(
                    It.Is<InactivityUndeployEvaluationOptions>(o => o.Org == "ttd" && o.Environment == null),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.Empty(_queuedApps);
        _deploymentRepository.Verify(
            r =>
                r.CountDecommissionsCreatedBySince(
                    It.IsAny<string>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WithoutOrg_ShouldThrowInvalidOperationException()
    {
        var context = new Mock<IJobExecutionContext>();
        context.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        context.Setup(c => c.MergedJobDataMap).Returns(new JobDataMap());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => CreateJob().Execute(context.Object));

        Assert.Contains(AppInactivityUndeployJobConstants.JobDataOrgKey, exception.Message);
        _inactivityUndeployService.Verify(
            x =>
                x.GetAppsForDecommissioningAsync(
                    It.IsAny<InactivityUndeployEvaluationOptions>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_InDryRunForOrgThatIsNotEnforced_ShouldRecordCandidatesAndQueueNothing()
    {
        SetupCandidates("skd", "app2", "app1");

        var span = await ExecuteWithRootSpan("skd");

        Assert.Empty(_queuedApps);
        Assert.Equal(true, span.GetTagItem("altinn.designer.inactivity_undeploy.dry_run"));
        Assert.Equal(2, span.GetTagItem("altinn.designer.inactivity_undeploy.candidate_count"));
        Assert.Equal(
            ["at23/app1", "at23/app2"],
            Assert.IsType<string[]>(span.GetTagItem("altinn.designer.inactivity_undeploy.candidate_apps"))
        );
        Assert.Null(span.GetTagItem("altinn.designer.inactivity_undeploy.queued_count"));
    }

    [Fact]
    public async Task Execute_InDryRun_ShouldBoundCandidateAppsOnSpan()
    {
        SetupCandidates("skd", Enumerable.Range(0, 150).Select(i => $"app{i:D3}").ToArray());

        var span = await ExecuteWithRootSpan("skd");

        Assert.Equal(150, span.GetTagItem("altinn.designer.inactivity_undeploy.candidate_count"));
        Assert.Equal(
            100,
            Assert.IsType<string[]>(span.GetTagItem("altinn.designer.inactivity_undeploy.candidate_apps")).Length
        );
    }

    [Fact]
    public async Task Execute_InDryRunForEnforcedOrg_ShouldQueueCandidates()
    {
        SetupCandidates("TTD", "app2", "app1");

        var span = await ExecuteWithRootSpan("TTD");

        Assert.Equal(["app1", "app2"], _queuedApps);
        Assert.Equal(false, span.GetTagItem("altinn.designer.inactivity_undeploy.dry_run"));
        Assert.Equal(2, span.GetTagItem("altinn.designer.inactivity_undeploy.queued_count"));
        Assert.Equal(false, span.GetTagItem("altinn.designer.inactivity_undeploy.cap_reached"));
    }

    [Fact]
    public async Task Execute_InEnforceMode_ShouldQueueCandidatesForAnyOrg()
    {
        _schedulingSettings.InactivityUndeploy.Mode = InactivityUndeployMode.Enforce;
        SetupCandidates("skd", "app1");

        await CreateJob().Execute(CreateContext("skd"));

        Assert.Equal(["app1"], _queuedApps);
    }

    [Fact]
    public async Task Execute_WhenRecentUndeploysAndPendingJobsUseTheCap_ShouldQueueOnlyTheRemainder()
    {
        _schedulingSettings.InactivityUndeploy.MaxUndeploysPerDay = 5;
        SetupCandidates("ttd", "app1", "app2", "app3", "app4");
        SetupRecentUndeploys(2);
        SetupPendingJobs(1);

        var span = await ExecuteWithRootSpan("ttd");

        Assert.Equal(["app1", "app2"], _queuedApps);
        Assert.Equal(5, span.GetTagItem("altinn.designer.inactivity_undeploy.max_undeploys_per_day"));
        Assert.Equal(2, span.GetTagItem("altinn.designer.inactivity_undeploy.recent_undeploy_count"));
        Assert.Equal(1, span.GetTagItem("altinn.designer.inactivity_undeploy.pending_undeploy_job_count"));
        Assert.Equal(2, span.GetTagItem("altinn.designer.inactivity_undeploy.queued_count"));
        Assert.Equal(true, span.GetTagItem("altinn.designer.inactivity_undeploy.cap_reached"));
        Assert.Equal(2, span.GetTagItem("altinn.designer.inactivity_undeploy.cap_skipped_count"));
        _deploymentRepository.Verify(
            r =>
                r.CountDecommissionsCreatedBySince(
                    AppInactivityUndeployJobConstants.SystemDeveloper,
                    s_now.AddDays(-1),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenCapIsUsedUp_ShouldQueueNothing()
    {
        _schedulingSettings.InactivityUndeploy.MaxUndeploysPerDay = 3;
        SetupCandidates("ttd", "app1");
        SetupRecentUndeploys(2);
        SetupPendingJobs(2);

        var span = await ExecuteWithRootSpan("ttd");

        Assert.Empty(_queuedApps);
        Assert.Equal(true, span.GetTagItem("altinn.designer.inactivity_undeploy.cap_reached"));
        Assert.Equal(1, span.GetTagItem("altinn.designer.inactivity_undeploy.cap_skipped_count"));
    }

    [Fact]
    public async Task Execute_WhenTriggerAlreadyExists_ShouldNotCountItAgainstTheCap()
    {
        _schedulingSettings.InactivityUndeploy.MaxUndeploysPerDay = 1;
        SetupCandidates("ttd", "app1", "app2");
        _jobQueue
            .Setup(q =>
                q.QueuePerAppUndeployJobAsync(
                    "ttd",
                    "app1",
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false);

        var span = await ExecuteWithRootSpan("ttd");

        Assert.Equal(["app2"], _queuedApps);
        Assert.Equal(1, span.GetTagItem("altinn.designer.inactivity_undeploy.queued_count"));
        Assert.Equal(false, span.GetTagItem("altinn.designer.inactivity_undeploy.cap_reached"));
    }

    private void SetupCandidates(string org, params string[] apps)
    {
        _inactivityUndeployService
            .Setup(x =>
                x.GetAppsForDecommissioningAsync(
                    It.IsAny<InactivityUndeployEvaluationOptions>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                apps.Select(app => new InactivityUndeployCandidate
                    {
                        Org = org,
                        App = app,
                        Environment = "at23",
                    })
                    .ToArray()
            );
    }

    private void SetupRecentUndeploys(int count) =>
        _deploymentRepository
            .Setup(r =>
                r.CountDecommissionsCreatedBySince(
                    It.IsAny<string>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(count);

    private void SetupPendingJobs(int count) =>
        _jobQueue.Setup(q => q.CountPendingPerAppUndeployJobsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(count);

    private AppInactivityUndeployPerOrgJob CreateJob() =>
        new(
            _inactivityUndeployService.Object,
            _jobQueue.Object,
            _deploymentRepository.Object,
            _schedulingSettings,
            new FakeTimeProvider(s_now)
        );

    private static IJobExecutionContext CreateContext(string org)
    {
        var context = new Mock<IJobExecutionContext>();
        context.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        context
            .Setup(c => c.MergedJobDataMap)
            .Returns(new JobDataMap { [AppInactivityUndeployJobConstants.JobDataOrgKey] = org });
        return context.Object;
    }

    /// <summary>
    /// Runs the job inside a span named like the one Quartz starts around a job run, which the job tags as its root.
    /// </summary>
    private async Task<Activity> ExecuteWithRootSpan(string org)
    {
        using var listener = new ActivityListener
        {
            ShouldListenTo = _ => true,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
        };
        ActivitySource.AddActivityListener(listener);
        using var source = new ActivitySource(nameof(AppInactivityUndeployPerOrgJobTests));
        using var jobSpan = source.StartActivity("Quartz.Job.Execute");
        Assert.NotNull(jobSpan);

        await CreateJob().Execute(CreateContext(org));

        return jobSpan;
    }
}
