using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppActivity;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Quartz;
using Xunit;
using ResourceRegistryOrg = Altinn.ResourceRegistry.Core.Models.Org;

namespace Designer.Tests.Scheduling;

public class AppActivityCollectionJobTests
{
    private const string OrgName = "ttd";
    private static readonly DateTimeOffset s_now = new(2026, 10, 13, 2, 0, 0, TimeSpan.Zero);

    private readonly Mock<IOrgService> _orgService = new();
    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly Mock<IAppActivityRepository> _appActivityRepository = new();
    private readonly List<AppActivityCollectionBatch> _upsertedBatches = [];

    public AppActivityCollectionJobTests()
    {
        _appActivityRepository
            .Setup(r => r.UpsertBatchAsync(It.IsAny<AppActivityCollectionBatch>(), It.IsAny<CancellationToken>()))
            .Callback<AppActivityCollectionBatch, CancellationToken>((batch, _) => _upsertedBatches.Add(batch))
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task Execute_WithoutPreviousCollection_ShouldRequestInitialWindow()
    {
        SetupEnvironments(OrgName, "tt02");
        SetupDeployments("tt02", "app1");
        SetupSignals("tt02", OkResponse());

        await CreateJob().Execute(CreateContext(OrgName));

        VerifySignalsRequested("tt02", AppActivityCollectionJobConstants.InitialWindowDays);
        var batch = Assert.Single(_upsertedBatches);
        Assert.Equal(AppActivityCollectionJobConstants.InitialWindowDays, batch.WindowDays);
        Assert.Equal(s_now, batch.CollectedAt);
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(25, 2)]
    [InlineData(49, 3)]
    [InlineData(24 * 10, 11)]
    [InlineData(24 * 60, 29)]
    public async Task Execute_WithPreviousCollection_ShouldRequestDaysSinceLatestCollectionPlusOneWithinBounds(
        int hoursSinceLatestCollection,
        int expectedWindowDays
    )
    {
        SetupEnvironments(OrgName, "tt02");
        SetupDeployments("tt02", "app1");
        SetupSignals("tt02", OkResponse());
        _appActivityRepository
            .Setup(r => r.GetLatestCollectedAtAsync(OrgName, "tt02", It.IsAny<CancellationToken>()))
            .ReturnsAsync(s_now.AddHours(-hoursSinceLatestCollection));

        await CreateJob().Execute(CreateContext(OrgName));

        VerifySignalsRequested("tt02", expectedWindowDays);
    }

    [Fact]
    public async Task Execute_WithoutOrg_ShouldCollectAllOrgsAndIsolateFailingOrgs()
    {
        _orgService
            .Setup(s => s.GetOrgList(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new OrgList
                {
                    Orgs = new Dictionary<string, ResourceRegistryOrg> { ["broken"] = new(), ["ttd"] = new() },
                }
            );
        _environmentsService
            .Setup(s => s.GetOrganizationEnvironments("broken", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));
        SetupEnvironments(OrgName, "at22", "prod", "tt02");
        SetupDeployments("at22", "app1");
        SetupDeployments("tt02", "app1");
        SetupSignals("at22", OkResponse());
        SetupSignals("tt02", OkResponse());

        await CreateJob().Execute(CreateContext(org: null));

        Assert.Equal(["at22", "tt02"], _upsertedBatches.Select(b => b.Environment).Order());
    }

    [Fact]
    public async Task Execute_ShouldStoreDeployedAppsWithoutSignalsAndIgnoreOtherCategories()
    {
        var lastWrite = s_now.AddDays(-3);
        var lastRead = s_now.AddDays(-1);
        SetupEnvironments(OrgName, "tt02");
        SetupDeployments("tt02", "idle-app", "busy-app", "busy-app");
        SetupSignals(
            "tt02",
            OkResponse(
                new AppActivitySignals(
                    "busy-app",
                    [
                        new AppActivitySignal(AppActivitySignalCategory.Write, 42, lastWrite),
                        new AppActivitySignal(AppActivitySignalCategory.Read, 10, lastRead),
                        new AppActivitySignal("background_dependency", 5, lastRead),
                    ]
                ),
                new AppActivitySignals(
                    "undeployed-app",
                    [new AppActivitySignal(AppActivitySignalCategory.Read, 1, lastRead)]
                )
            )
        );

        await CreateJob().Execute(CreateContext(OrgName));

        var batch = Assert.Single(_upsertedBatches);
        Assert.Equal(["busy-app", "idle-app", "undeployed-app"], batch.Observations.Select(o => o.App));

        var busy = batch.Observations.Single(o => o.App == "busy-app");
        Assert.True(busy.Deployed);
        Assert.Equal(lastWrite, busy.LastWriteAt);
        Assert.Equal(lastRead, busy.LastReadAt);
        Assert.Equal(
            new Dictionary<string, double>
            {
                [AppActivitySignalCategory.Write] = 42,
                [AppActivitySignalCategory.Read] = 10,
            },
            busy.WindowCounts
        );

        var idle = batch.Observations.Single(o => o.App == "idle-app");
        Assert.True(idle.Deployed);
        Assert.Empty(idle.WindowCounts);
        Assert.Null(idle.LastWriteAt);

        var undeployed = batch.Observations.Single(o => o.App == "undeployed-app");
        Assert.False(undeployed.Deployed);
        Assert.Equal(lastRead, undeployed.LastReadAt);
    }

    [Fact]
    public async Task Execute_WhenEnvironmentsFail_ShouldCollectTheOthers()
    {
        SetupEnvironments(OrgName, "at22", "at23", "at24", "tt02");
        _runtimeGatewayClient
            .Setup(c => c.GetAppDeployments(OrgName, AltinnEnvironment.FromName("at22"), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom", null, HttpStatusCode.BadGateway));
        SetupDeployments("at23", "app1");
        SetupSignalsFailure("at23", new TaskCanceledException("gateway timeout"));
        SetupDeployments("at24", "app1");
        SetupSignalsFailure("at24", new HttpRequestException("not found", null, HttpStatusCode.NotFound));
        SetupDeployments("tt02", "app1");
        SetupSignals("tt02", OkResponse());

        await CreateJob().Execute(CreateContext(OrgName));

        var batch = Assert.Single(_upsertedBatches);
        Assert.Equal("tt02", batch.Environment);
    }

    [Theory]
    [InlineData("unavailable")]
    [InlineData("error")]
    public async Task Execute_WhenSignalsAreNotOk_ShouldRecordNothing(string status)
    {
        SetupEnvironments(OrgName, "tt02");
        SetupDeployments("tt02", "app1");
        SetupSignals("tt02", new AppActivitySignalsResponse(status, 29, s_now, []));

        await CreateJob().Execute(CreateContext(OrgName));

        Assert.Empty(_upsertedBatches);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task Execute_WhenNoDeploymentsAreListed_ShouldOnlyCollectWhenNoAppIsTrackedAsDeployed(
        bool hasDeployedApps,
        bool expectCollection
    )
    {
        SetupEnvironments(OrgName, "tt02");
        SetupDeployments("tt02");
        SetupSignals("tt02", OkResponse());
        _appActivityRepository
            .Setup(r => r.HasDeployedAppsAsync(OrgName, "tt02", It.IsAny<CancellationToken>()))
            .ReturnsAsync(hasDeployedApps);

        await CreateJob().Execute(CreateContext(OrgName));

        Assert.Equal(expectCollection, _upsertedBatches.Count == 1);
    }

    [Fact]
    public async Task Execute_ForAllOrgs_ShouldRecordOutcomesOnRootSpanAndServiceOwnerPerEnvironment()
    {
        _orgService
            .Setup(s => s.GetOrgList(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OrgList { Orgs = new Dictionary<string, ResourceRegistryOrg> { [OrgName] = new() } });
        SetupEnvironments(OrgName, "at22", "tt02");
        SetupDeployments("at22", "app1");
        SetupSignals("at22", new AppActivitySignalsResponse("unavailable", 29, s_now, []));
        SetupDeployments("tt02", "app1");
        SetupSignals("tt02", OkResponse());

        var (root, spans) = await ExecuteWithSpans(org: null);

        Assert.Equal("always", root.GetTagItem(ServiceTelemetry.Attributes.Sampling));
        Assert.Null(root.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppActivity.ServiceOwnerCount));
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppActivity.EnvironmentCollectedCount));
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppActivity.EnvironmentSkippedCount));
        Assert.Equal(0, root.GetTagItem(ServiceTelemetry.Attributes.AppActivity.EnvironmentFailedCount));

        var skipped = Assert.Single(
            spans,
            span => Equals(span.GetTagItem(ServiceTelemetry.Attributes.Environment), "at22")
        );
        Assert.Equal("AppActivityCollectionJob.CollectEnvironment", skipped.DisplayName);
        Assert.Equal(OrgName, skipped.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal(
            "signals_status_unavailable",
            skipped.GetTagItem(ServiceTelemetry.Attributes.AppActivity.CollectionSkipReason)
        );
        Assert.Empty(skipped.Events);

        var collected = Assert.Single(
            spans,
            span => Equals(span.GetTagItem(ServiceTelemetry.Attributes.Environment), "tt02")
        );
        Assert.Equal(OrgName, collected.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal(1, collected.GetTagItem(ServiceTelemetry.Attributes.AppActivity.DeployedAppCount));
        Assert.Equal(1, collected.GetTagItem(ServiceTelemetry.Attributes.AppActivity.DeployedAppWithoutSignalCount));
        Assert.Equal(
            AppActivityCollectionJobConstants.InitialWindowDays,
            collected.GetTagItem(ServiceTelemetry.Attributes.AppActivity.WindowDays)
        );
        Assert.Null(collected.GetTagItem(ServiceTelemetry.Attributes.AppActivity.CollectionSkipReason));
        Assert.Empty(collected.Events);
    }

    [Fact]
    public async Task Execute_ForOneOrg_ShouldRecordServiceOwnerOnRootSpanOnly()
    {
        SetupEnvironments(OrgName, "tt02");
        SetupDeployments("tt02", "app1");
        SetupSignals("tt02", OkResponse());

        var (root, spans) = await ExecuteWithSpans(OrgName);

        Assert.Equal(OrgName, root.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        var environmentSpan = Assert.Single(spans);
        Assert.Null(environmentSpan.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("tt02", environmentSpan.GetTagItem(ServiceTelemetry.Attributes.Environment));
    }

    private async Task<(Activity Root, List<Activity> Spans)> ExecuteWithSpans(string org)
    {
        var spans = new List<Activity>();
        using var root = new Activity("Quartz.Job.Execute").SetIdFormat(ActivityIdFormat.W3C).Start();
        // Initializes ServiceTelemetry first: creating its ActivitySource calls the listener's filter.
        string sourceName = ServiceTelemetry.Source.Name;
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == sourceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity =>
            {
                if (activity.TraceId == root.TraceId)
                {
                    lock (spans)
                    {
                        spans.Add(activity);
                    }
                }
            },
        };
        ActivitySource.AddActivityListener(listener);

        await CreateJob().Execute(CreateContext(org));

        return (root, spans);
    }

    private AppActivityCollectionJob CreateJob()
    {
        return new AppActivityCollectionJob(
            _orgService.Object,
            _environmentsService.Object,
            _runtimeGatewayClient.Object,
            _appActivityRepository.Object,
            new FakeTimeProvider(s_now)
        );
    }

    private static IJobExecutionContext CreateContext(string org)
    {
        var jobData = new JobDataMap();
        if (org is not null)
        {
            jobData[AppActivityCollectionJobConstants.JobDataOrgKey] = org;
        }

        var context = new Mock<IJobExecutionContext>();
        context.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        context.Setup(c => c.MergedJobDataMap).Returns(jobData);
        return context.Object;
    }

    private void SetupEnvironments(string org, params string[] environments)
    {
        _environmentsService
            .Setup(s => s.GetOrganizationEnvironments(org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(environments.Select(name => new EnvironmentModel { Name = name }));
    }

    private void SetupDeployments(string environment, params string[] apps)
    {
        _runtimeGatewayClient
            .Setup(c =>
                c.GetAppDeployments(OrgName, AltinnEnvironment.FromName(environment), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(apps.Select(app => new AppDeployment(OrgName, environment, app, "production", "1", "v1")));
    }

    private void SetupSignals(string environment, AppActivitySignalsResponse response)
    {
        _runtimeGatewayClient
            .Setup(c =>
                c.GetAppActivitySignalsAsync(
                    OrgName,
                    AltinnEnvironment.FromName(environment),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(response);
    }

    private void SetupSignalsFailure(string environment, Exception exception)
    {
        _runtimeGatewayClient
            .Setup(c =>
                c.GetAppActivitySignalsAsync(
                    OrgName,
                    AltinnEnvironment.FromName(environment),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(exception);
    }

    private void VerifySignalsRequested(string environment, int windowDays)
    {
        _runtimeGatewayClient.Verify(
            c =>
                c.GetAppActivitySignalsAsync(
                    OrgName,
                    AltinnEnvironment.FromName(environment),
                    windowDays,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private static AppActivitySignalsResponse OkResponse(params AppActivitySignals[] apps)
    {
        return new AppActivitySignalsResponse("ok", 29, s_now, apps);
    }
}
