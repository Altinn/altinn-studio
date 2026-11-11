using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;
using Microsoft.Extensions.Time.Testing;
using Microsoft.Rest.TransientFaultHandling;
using Moq;
using Quartz;
using Xunit;
using ResourceRegistryOrg = Altinn.ResourceRegistry.Core.Models.Org;

namespace Designer.Tests.Scheduling;

public class AppDailyMetricsCollectionJobTests
{
    private const string OrgName = "ttd";
    private static readonly DateTimeOffset s_now = new(2026, 11, 11, 2, 30, 0, TimeSpan.Zero);
    private static readonly DateOnly s_yesterday = new(2026, 11, 10);

    private readonly Mock<IOrgService> _orgService = new();
    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IAltinnStorageMetricsClient> _storageMetricsClient = new();
    private readonly Mock<IAppDailyMetricsRepository> _repository = new();
    private readonly List<AppDailyMetricsBatch> _upsertedBatches = [];

    public AppDailyMetricsCollectionJobTests()
    {
        _repository
            .Setup(r => r.UpsertDayAsync(It.IsAny<AppDailyMetricsBatch>(), It.IsAny<CancellationToken>()))
            .Callback<AppDailyMetricsBatch, CancellationToken>((batch, _) => _upsertedBatches.Add(batch))
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task Execute_WithoutDate_ShouldCollectYesterdayWithSnapshot()
    {
        SetupEnvironments(OrgName, "tt02");
        SetupMetrics(
            "tt02",
            s_yesterday,
            App(
                "kpi-a",
                created: 3,
                completed: 2,
                p50: 600,
                open: 5,
                openOld: 1,
                unconfirmedOld: 4,
                tasks: [("Task_1", 4), ("Task_2", 1)]
            )
        );

        await CreateJob().Execute(CreateContext(OrgName));

        var batch = Assert.Single(_upsertedBatches);
        Assert.Equal(OrgName, batch.Org);
        Assert.Equal("tt02", batch.Environment);
        Assert.Equal(s_yesterday, batch.MetricDate);
        Assert.True(batch.IncludesSnapshot);
        var observation = Assert.Single(batch.Observations);
        Assert.Equal("kpi-a", observation.App);
        Assert.Equal(3, observation.InstancesCreated);
        Assert.Equal(2, observation.InstancesCompleted);
        Assert.Equal(600, observation.SecondsToCompleteP50);
        Assert.Equal(5, observation.OpenInstances);
        Assert.Equal(1, observation.OpenOver90Days);
        Assert.Equal(4, observation.UnconfirmedOver90Days);
        Assert.Equal(new Dictionary<string, int> { ["Task_1"] = 4, ["Task_2"] = 1 }, observation.OpenByTask);
    }

    [Fact]
    public async Task Execute_WithEarlierDate_ShouldCollectThatDayWithoutSnapshot()
    {
        var earlier = new DateOnly(2026, 10, 1);
        SetupEnvironments(OrgName, "tt02");
        SetupMetrics(
            "tt02",
            earlier,
            App("kpi-a", created: 1, completed: 0, p50: null, open: 9, openOld: 9, unconfirmedOld: 0)
        );

        await CreateJob().Execute(CreateContext(OrgName, "2026-10-01"));

        var batch = Assert.Single(_upsertedBatches);
        Assert.Equal(earlier, batch.MetricDate);
        Assert.False(batch.IncludesSnapshot);
        Assert.Null(Assert.Single(batch.Observations).SecondsToCompleteP50);
    }

    [Fact]
    public async Task Execute_WithYesterdayAsDate_ShouldIncludeSnapshot()
    {
        SetupEnvironments(OrgName, "tt02");
        SetupMetrics("tt02", s_yesterday);

        await CreateJob().Execute(CreateContext(OrgName, "2026-11-10"));

        Assert.True(Assert.Single(_upsertedBatches).IncludesSnapshot);
    }

    [Fact]
    public async Task Execute_WithInvalidDate_ShouldFail()
    {
        SetupEnvironments(OrgName, "tt02");

        await Assert.ThrowsAsync<ArgumentException>(() => CreateJob().Execute(CreateContext(OrgName, "yesterday")));

        Assert.Empty(_upsertedBatches);
    }

    [Fact]
    public async Task Execute_ShouldCollectProductionAndTt02InOrderAndSkipTestEnvironments()
    {
        SetupEnvironments(OrgName, "tt02", "production", "at22", "yt01");
        SetupMetrics("production", s_yesterday);
        SetupMetrics("tt02", s_yesterday);

        await CreateJob().Execute(CreateContext(OrgName));

        Assert.Equal(["production", "tt02"], _upsertedBatches.Select(b => b.Environment));
        _storageMetricsClient.Verify(
            c => c.GetDailyMetrics(OrgName, "at22", It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WhenStorageHasNoMetricsEndpoint_ShouldSkipEnvironmentAndContinue()
    {
        SetupEnvironments(OrgName, "production", "tt02");
        _storageMetricsClient
            .Setup(c => c.GetDailyMetrics(OrgName, "production", s_yesterday, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestWithStatusException("Not Found") { StatusCode = HttpStatusCode.NotFound });
        SetupMetrics("tt02", s_yesterday);

        var (root, spans) = await ExecuteWithSpans(OrgName);

        Assert.Equal("tt02", Assert.Single(_upsertedBatches).Environment);
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentCollectedCount));
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentSkippedCount));
        Assert.Equal(0, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentFailedCount));
        var skipped = Assert.Single(
            spans,
            span => Equals(span.GetTagItem(ServiceTelemetry.Attributes.Environment), "prod")
        );
        Assert.Equal(
            "metrics_endpoint_not_found",
            skipped.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.CollectionSkipReason)
        );
    }

    [Fact]
    public async Task Execute_WhenStorageFails_ShouldRecordFailureAndContinueWithNextEnvironment()
    {
        SetupEnvironments(OrgName, "production", "tt02");
        _storageMetricsClient
            .Setup(c => c.GetDailyMetrics(OrgName, "production", s_yesterday, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestWithStatusException("Boom") { StatusCode = HttpStatusCode.BadGateway });
        SetupMetrics("tt02", s_yesterday);

        var (root, spans) = await ExecuteWithSpans(OrgName);

        Assert.Equal("tt02", Assert.Single(_upsertedBatches).Environment);
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentFailedCount));
        var failed = Assert.Single(
            spans,
            span => Equals(span.GetTagItem(ServiceTelemetry.Attributes.Environment), "prod")
        );
        Assert.Equal(ActivityStatusCode.Error, failed.Status);
        Assert.Equal(
            "collection_failed",
            failed.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.CollectionSkipReason)
        );
    }

    [Fact]
    public async Task Execute_ForAllOrgs_ShouldCollectEveryOrgAndCountFailedServiceOwners()
    {
        _orgService
            .Setup(s => s.GetOrgList(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new OrgList
                {
                    Orgs = new Dictionary<string, ResourceRegistryOrg>
                    {
                        ["ttd"] = new(),
                        ["skd"] = new(),
                        ["broken"] = new(),
                    },
                }
            );
        SetupEnvironments("ttd", "tt02");
        SetupEnvironments("skd", "tt02");
        _environmentsService
            .Setup(s => s.GetOrganizationEnvironments("broken", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new KeyNotFoundException("Organization 'broken' not found."));
        SetupMetrics("tt02", s_yesterday, org: "ttd");
        SetupMetrics("tt02", s_yesterday, org: "skd");

        var (root, spans) = await ExecuteWithSpans(org: null);

        Assert.Equal(["skd", "ttd"], _upsertedBatches.Select(b => b.Org));
        Assert.Equal("always", root.GetTagItem(ServiceTelemetry.Attributes.Sampling));
        Assert.Null(root.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("2026-11-10", root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.MetricDate));
        Assert.Equal(true, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.IncludesSnapshot));
        Assert.Equal(3, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.ServiceOwnerCount));
        Assert.Equal(1, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.ServiceOwnerFailedCount));
        Assert.Equal(2, root.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentCollectedCount));
        Assert.All(spans, span => Assert.NotNull(span.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner)));
    }

    [Fact]
    public async Task Execute_ForOneOrg_ShouldRecordServiceOwnerOnRootSpanOnly()
    {
        SetupEnvironments(OrgName, "tt02");
        SetupMetrics("tt02", s_yesterday, App("kpi-a"));

        var (root, spans) = await ExecuteWithSpans(OrgName);

        Assert.Equal(OrgName, root.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        var environmentSpan = Assert.Single(spans);
        Assert.Null(environmentSpan.GetTagItem(ServiceTelemetry.Attributes.ServiceOwner));
        Assert.Equal("tt02", environmentSpan.GetTagItem(ServiceTelemetry.Attributes.Environment));
        Assert.Equal(1, environmentSpan.GetTagItem(ServiceTelemetry.Attributes.AppDailyMetrics.AppCount));
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

    private AppDailyMetricsCollectionJob CreateJob()
    {
        return new AppDailyMetricsCollectionJob(
            _orgService.Object,
            _environmentsService.Object,
            _storageMetricsClient.Object,
            _repository.Object,
            new FakeTimeProvider(s_now)
        );
    }

    private static IJobExecutionContext CreateContext(string org, string date = null)
    {
        var jobData = new JobDataMap();
        if (org is not null)
        {
            jobData[AppDailyMetricsCollectionJobConstants.JobDataOrgKey] = org;
        }

        if (date is not null)
        {
            jobData[AppDailyMetricsCollectionJobConstants.JobDataDateKey] = date;
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
            .ReturnsAsync(environments.Select(name => new EnvironmentModel { Name = name }).ToList());
    }

    private void SetupMetrics(string environment, DateOnly date, params StudioAppDailyMetrics[] apps)
    {
        SetupMetrics(environment, date, OrgName, apps);
    }

    private void SetupMetrics(string environment, DateOnly date, string org, params StudioAppDailyMetrics[] apps)
    {
        _storageMetricsClient
            .Setup(c => c.GetDailyMetrics(org, environment, date, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new StudioDailyMetrics
                {
                    Org = org,
                    Date = date,
                    ComputedAt = s_now,
                    Apps = apps,
                }
            );
    }

    private static StudioAppDailyMetrics App(
        string app,
        long created = 0,
        long completed = 0,
        int? p50 = null,
        long open = 0,
        long openOld = 0,
        long unconfirmedOld = 0,
        (string TaskId, long Open)[] tasks = null
    )
    {
        return new StudioAppDailyMetrics
        {
            App = app,
            InstancesCreated = created,
            InstancesCompleted = completed,
            SecondsToCompleteP50 = p50,
            OpenInstances = open,
            OpenOver90Days = openOld,
            UnconfirmedOver90Days = unconfirmedOld,
            OpenByTask = (tasks ?? [])
                .Select(task => new StudioOpenTaskCount { TaskId = task.TaskId, OpenInstances = task.Open })
                .ToList(),
        };
    }
}
