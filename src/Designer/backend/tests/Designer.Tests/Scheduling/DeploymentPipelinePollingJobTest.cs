#nullable enable
using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Telemetry;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Newtonsoft.Json;
using Quartz;
using Xunit;
using SchedulerConstants = Altinn.Studio.Designer.Scheduling.DeploymentPipelinePollingJobConstants.Arguments;

namespace Designer.Tests.Scheduling;

public class DeploymentPipelinePollingJobTest : IDisposable
{
    private static readonly DateTimeOffset s_now = new(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);

    private readonly AppDeployMetricsRecorder _metrics = new();
    private readonly FakeTimeProvider _timeProvider = new(s_now);

    public void Dispose() => _metrics.Dispose();

    [Fact]
    public async Task Execute_Undeploy_UpdatesJsonData_PassesPayloadToStorageClient()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Undeploy);
        var appMetadata = new ApplicationMetadata("org/app");
        var capturedAppMetadataJson = string.Empty;

        fixture
            .MockStorageAppMetadataClient.Setup(x =>
                x.GetApplicationMetadataJsonAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonConvert.SerializeObject(appMetadata));

        fixture
            .MockStorageAppMetadataClient.Setup(x =>
                x.UpsertApplicationMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                )
            )
            .Callback(
                (string org, string app, string applicationMetadataJson, string envName) =>
                {
                    capturedAppMetadataJson = applicationMetadataJson;
                }
            );

        fixture
            .MockAzureDevOpsBuildClient.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BuildEntity { Status = BuildStatus.Completed, Result = BuildResult.Succeeded });

        fixture
            .MockDeploymentRepository.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new DeploymentEntity { Build = new BuildEntity { Status = BuildStatus.None } });

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        var capturedAppMetadata = JsonConvert.DeserializeObject<ApplicationMetadata>(capturedAppMetadataJson);
        Assert.NotNull(capturedAppMetadata);
        Assert.False(capturedAppMetadata.CopyInstanceSettings.Enabled);
    }

    [Fact]
    public async Task Execute_WithTraceParentWithoutTraceState_DoesNotThrow()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        var jobExecutionContext = JobExecutionContextFactory(
            PipelineType.Deploy,
            traceParent: CreateValidTraceParent()
        );

        fixture
            .MockAzureDevOpsBuildClient.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BuildEntity { Status = BuildStatus.Completed, Result = BuildResult.Succeeded });

        fixture
            .MockDeploymentRepository.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new DeploymentEntity { Build = new BuildEntity { Status = BuildStatus.None } });

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockAzureDevOpsBuildClient.Verify(x => x.Get("12345", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WithInvalidTraceParent_DoesNotThrow()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Deploy, traceParent: "invalid");

        fixture
            .MockAzureDevOpsBuildClient.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BuildEntity { Status = BuildStatus.Completed, Result = BuildResult.Succeeded });

        fixture
            .MockDeploymentRepository.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new DeploymentEntity { Build = new BuildEntity { Status = BuildStatus.None } });

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockAzureDevOpsBuildClient.Verify(x => x.Get("12345", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenThePipelineFails_RecordsTheFailedDeploy()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        string traceParent = CreateValidTraceParent();
        using var spans = PollSpans(traceParent);
        SetupPoll(fixture, BuildResult.Failed, requestedAgo: TimeSpan.FromMinutes(7));

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy, traceParent: traceParent));

        // Assert
        RecordedAppDeployMeasurement pipeline = Assert.Single(
            _metrics.Measurements(AppDeployMetrics.PipelineDurationMetricName)
        );
        Assert.Equal(420, pipeline.Value);
        Assert.Equal("deploy", pipeline.Tags["altinn.designer.app_deploy.pipeline.type"]);
        Assert.Equal("tt02", pipeline.Tags["altinn.environment"]);
        Assert.Equal("failure", pipeline.Tags["cicd.pipeline.result"]);
        Assert.Equal("pipeline_failed", pipeline.Tags["error.type"]);

        RecordedAppDeployMeasurement deploy = Assert.Single(_metrics.Measurements(AppDeployMetrics.DurationMetricName));
        Assert.Equal(420, deploy.Value);
        Assert.Equal("testorg", deploy.Tags["altinn.service_owner"]);
        Assert.Equal("pipeline_failed", deploy.Tags["altinn.designer.app_deploy.result"]);
        Assert.Equal("pipeline_failed", deploy.Tags["error.type"]);
        Assert.Equal("testorg", pipeline.Tags["altinn.service_owner"]);

        Activity span = Assert.Single(spans.Stopped);
        Assert.Equal(ActivityStatusCode.Error, span.Status);
        Assert.Equal("The pipeline's result is failure", span.StatusDescription);
        Assert.Equal("12345", span.GetTagItem("altinn.app_deploy.build.id"));
        Assert.Equal("testorg", span.GetTagItem("altinn.service_owner"));
        Assert.Equal("testapp", span.GetTagItem("altinn.app"));
        Assert.Equal("tt02", span.GetTagItem("altinn.environment"));
        Assert.Equal("deploy", span.GetTagItem("altinn.designer.app_deploy.pipeline.type"));
        Assert.Equal("completed", span.GetTagItem("altinn.designer.app_deploy.pipeline.status"));
        Assert.Equal("failure", span.GetTagItem("cicd.pipeline.result"));
        Assert.Equal("pipeline_failed", span.GetTagItem("altinn.designer.app_deploy.result"));
        Assert.Equal("pipeline_failed", span.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Execute_WhenThePipelineSucceeds_RecordsOnlyThePipeline()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        string traceParent = CreateValidTraceParent();
        using var spans = PollSpans(traceParent);
        SetupPoll(fixture, BuildResult.Succeeded, requestedAgo: TimeSpan.FromMinutes(5));

        // Act
        await fixture.Service.Execute(
            JobExecutionContextFactory(PipelineType.Deploy, traceParent: traceParent, environment: "production")
        );

        // Assert
        RecordedAppDeployMeasurement pipeline = Assert.Single(
            _metrics.Measurements(AppDeployMetrics.PipelineDurationMetricName)
        );
        Assert.Equal(300, pipeline.Value);
        Assert.Equal("prod", pipeline.Tags["altinn.environment"]);
        Assert.Equal("success", pipeline.Tags["cicd.pipeline.result"]);
        Assert.False(pipeline.Tags.ContainsKey("error.type"));
        Assert.Empty(_metrics.Measurements(AppDeployMetrics.DurationMetricName));

        Activity span = Assert.Single(spans.Stopped);
        Assert.Equal(ActivityStatusCode.Unset, span.Status);
        Assert.Null(span.GetTagItem("altinn.designer.app_deploy.result"));
    }

    [Fact]
    public async Task Execute_WhileThePipelineRuns_RecordsNoMetrics()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        string traceParent = CreateValidTraceParent();
        using var spans = PollSpans(traceParent);
        SetupPoll(fixture, BuildResult.None, requestedAgo: TimeSpan.FromMinutes(2), status: BuildStatus.InProgress);

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Undeploy, traceParent: traceParent));

        // Assert
        Assert.Empty(_metrics.Measurements(AppDeployMetrics.PipelineDurationMetricName));
        Assert.Empty(_metrics.Measurements(AppDeployMetrics.DurationMetricName));
        Activity span = Assert.Single(spans.Stopped);
        Assert.Equal("undeploy", span.GetTagItem("altinn.designer.app_deploy.pipeline.type"));
        Assert.Equal("in_progress", span.GetTagItem("altinn.designer.app_deploy.pipeline.status"));
        Assert.Null(span.GetTagItem("cicd.pipeline.result"));
    }

    [Fact]
    public async Task Execute_WhenThePipelineIsCanceled_RecordsTheDeployWithoutAnError()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        string traceParent = CreateValidTraceParent();
        using var spans = PollSpans(traceParent);
        SetupPoll(fixture, BuildResult.Canceled, requestedAgo: TimeSpan.FromMinutes(3));

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy, traceParent: traceParent));

        // Assert
        RecordedAppDeployMeasurement pipeline = Assert.Single(
            _metrics.Measurements(AppDeployMetrics.PipelineDurationMetricName)
        );
        Assert.Equal("cancellation", pipeline.Tags["cicd.pipeline.result"]);
        Assert.False(pipeline.Tags.ContainsKey("error.type"));

        RecordedAppDeployMeasurement deploy = Assert.Single(_metrics.Measurements(AppDeployMetrics.DurationMetricName));
        Assert.Equal("pipeline_canceled", deploy.Tags["altinn.designer.app_deploy.result"]);
        Assert.False(deploy.Tags.ContainsKey("error.type"));

        Activity span = Assert.Single(spans.Stopped);
        Assert.Equal(ActivityStatusCode.Unset, span.Status);
        Assert.Null(span.GetTagItem("error.type"));
    }

    [Fact]
    public async Task Execute_WhenThePipelineFailsAfterFluxReported_KeepsFluxResult()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        string traceParent = CreateValidTraceParent();
        using var spans = PollSpans(traceParent);
        SetupPoll(
            fixture,
            BuildResult.Failed,
            requestedAgo: TimeSpan.FromMinutes(8),
            events: [new DeployEvent { EventType = DeployEventType.InstallSucceeded }]
        );

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy, traceParent: traceParent));

        // Assert
        Assert.Single(_metrics.Measurements(AppDeployMetrics.PipelineDurationMetricName));
        Assert.Empty(_metrics.Measurements(AppDeployMetrics.DurationMetricName));
        Activity span = Assert.Single(spans.Stopped);
        Assert.Null(span.GetTagItem("altinn.designer.app_deploy.result"));
        Assert.Equal(ActivityStatusCode.Error, span.Status);
    }

    [Fact]
    public async Task Execute_WithoutTraceContext_SetsTheDeployOnTheJobSpan()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        SetupPoll(fixture, BuildResult.Failed, requestedAgo: TimeSpan.FromMinutes(4));
        using var jobSpan = new Activity("Quartz.Job.Execute").Start();

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy));

        // Assert
        Assert.Equal("12345", jobSpan.GetTagItem("altinn.app_deploy.build.id"));
        Assert.Equal("testorg", jobSpan.GetTagItem("altinn.service_owner"));
        Assert.Equal("testapp", jobSpan.GetTagItem("altinn.app"));
        Assert.Equal("tt02", jobSpan.GetTagItem("altinn.environment"));
        Assert.Equal("failure", jobSpan.GetTagItem("cicd.pipeline.result"));
        Assert.Equal("pipeline_failed", jobSpan.GetTagItem("error.type"));
        Assert.Equal(ActivityStatusCode.Error, jobSpan.Status);
    }

    [Fact]
    public async Task Execute_WhenThePipelineFinishes_RecordsItsQueueAndRunTimes()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        DateTime queued = s_now.UtcDateTime.AddMinutes(-6);
        SetupPoll(
            fixture,
            BuildResult.Succeeded,
            requestedAgo: TimeSpan.FromMinutes(6),
            build: new BuildEntity
            {
                Status = BuildStatus.Completed,
                Result = BuildResult.Succeeded,
                Queued = queued,
                Started = queued.AddSeconds(45),
                Finished = queued.AddSeconds(345),
                PipelineName = "gitops-manager",
            }
        );

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy));

        // Assert
        var runs = _metrics.Measurements(AppDeployMetrics.PipelineRunDurationMetricName);
        Assert.Equal(2, runs.Count);
        RecordedAppDeployMeasurement pending = Assert.Single(
            runs,
            r => (string?)r.Tags["cicd.pipeline.run.state"] == "pending"
        );
        RecordedAppDeployMeasurement executing = Assert.Single(
            runs,
            r => (string?)r.Tags["cicd.pipeline.run.state"] == "executing"
        );
        Assert.Equal(45, pending.Value);
        Assert.Equal(300, executing.Value);
        Assert.False(pending.Tags.ContainsKey("cicd.pipeline.result"));
        Assert.Equal("gitops-manager", pending.Tags["cicd.pipeline.name"]);
        Assert.Equal("gitops-manager", executing.Tags["cicd.pipeline.name"]);
        Assert.Equal("success", executing.Tags["cicd.pipeline.result"]);
        Assert.Equal("tt02", executing.Tags["altinn.environment"]);
        Assert.False(executing.Tags.ContainsKey("altinn.service_owner"));
    }

    [Fact]
    public async Task Execute_WhenTheRunIsCanceledBeforeItStarts_RecordsOnlyTheWaitWithItsResult()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        DateTime queued = s_now.UtcDateTime.AddMinutes(-3);
        SetupPoll(
            fixture,
            BuildResult.Canceled,
            requestedAgo: TimeSpan.FromMinutes(3),
            build: new BuildEntity
            {
                Status = BuildStatus.Completed,
                Result = BuildResult.Canceled,
                Queued = queued,
                Finished = queued.AddSeconds(90),
                PipelineName = "gitops-manager",
            }
        );

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy));

        // Assert
        RecordedAppDeployMeasurement pending = Assert.Single(
            _metrics.Measurements(AppDeployMetrics.PipelineRunDurationMetricName)
        );
        Assert.Equal("pending", pending.Tags["cicd.pipeline.run.state"]);
        Assert.Equal(90, pending.Value);
        Assert.Equal("cancellation", pending.Tags["cicd.pipeline.result"]);
        Assert.False(pending.Tags.ContainsKey("error.type"));
    }

    [Fact]
    public async Task Execute_WhenAzureDevOpsReturnsNoPipelineName_RecordsNoRunDuration()
    {
        // Arrange
        var fixture = Fixture.Create(_metrics.Metrics, _timeProvider);
        DateTime queued = s_now.UtcDateTime.AddMinutes(-6);
        SetupPoll(
            fixture,
            BuildResult.Succeeded,
            requestedAgo: TimeSpan.FromMinutes(6),
            build: new BuildEntity
            {
                Status = BuildStatus.Completed,
                Result = BuildResult.Succeeded,
                Queued = queued,
                Started = queued.AddSeconds(45),
                Finished = queued.AddSeconds(345),
            }
        );

        // Act
        await fixture.Service.Execute(JobExecutionContextFactory(PipelineType.Deploy));

        // Assert
        Assert.Empty(_metrics.Measurements(AppDeployMetrics.PipelineRunDurationMetricName));
        Assert.Single(_metrics.Measurements(AppDeployMetrics.PipelineDurationMetricName));
    }

    [Fact]
    public void PollsOfOneBuild_DoNotOverlap()
    {
        // Quartz runs one job key at a time, and each build has its own key, so only polls of the same build wait.
        Assert.NotNull(typeof(DeploymentPipelinePollingJob).GetCustomAttribute<DisallowConcurrentExecutionAttribute>());
        var context = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "app", "testUser");
        Assert.Equal(
            DeploymentPipelinePollingJobConstants.JobIdentity(context, 1),
            DeploymentPipelinePollingJobConstants.JobIdentity(context, 1)
        );
        Assert.NotEqual(
            DeploymentPipelinePollingJobConstants.JobIdentity(context, 1),
            DeploymentPipelinePollingJobConstants.JobIdentity(context, 2)
        );
    }

    private void SetupPoll(
        Fixture fixture,
        BuildResult result,
        TimeSpan requestedAgo,
        BuildStatus status = BuildStatus.Completed,
        DeployEvent[]? events = null,
        BuildEntity? build = null
    )
    {
        fixture
            .MockAzureDevOpsBuildClient.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(build ?? new BuildEntity { Status = status, Result = result });

        fixture
            .MockDeploymentRepository.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(
                new DeploymentEntity
                {
                    Created = (s_now - requestedAgo).UtcDateTime,
                    Build = new BuildEntity { Status = BuildStatus.None },
                    Events = [.. events ?? []],
                }
            );
    }

    /// <summary>
    /// Collects the poll spans in one trace, so that tests running in parallel don't see each other's.
    /// </summary>
    private static SpanCollector PollSpans(string traceParent) => new(ActivityContext.Parse(traceParent, null).TraceId);

    private sealed class SpanCollector : IDisposable
    {
        private readonly ActivityListener _listener;
        private readonly ConcurrentQueue<Activity> _stopped = new();

        public SpanCollector(ActivityTraceId traceId)
        {
            _listener = new ActivityListener
            {
                ShouldListenTo = source => source.Name == ServiceTelemetry.MeterName,
                Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
                ActivityStopped = activity =>
                {
                    if (activity.TraceId == traceId)
                    {
                        _stopped.Enqueue(activity);
                    }
                },
            };
            ActivitySource.AddActivityListener(_listener);
        }

        public Activity[] Stopped => [.. _stopped];

        public void Dispose() => _listener.Dispose();
    }

    private sealed record Fixture(
        DeploymentPipelinePollingJob DeploymentPipelinePollingJob,
        Mock<IAltinnStorageAppMetadataClient> MockStorageAppMetadataClient,
        Mock<IDeploymentRepository> MockDeploymentRepository,
        Mock<IAzureDevOpsBuildClient> MockAzureDevOpsBuildClient
    )
    {
        public DeploymentPipelinePollingJob Service => DeploymentPipelinePollingJob;

        public static Fixture Create(AppDeployMetrics metrics, TimeProvider timeProvider)
        {
            var mockStorageAppMetadataClient = new Mock<IAltinnStorageAppMetadataClient>();
            var mockDeploymentRepository = new Mock<IDeploymentRepository>();
            var mockDeployEventRepository = new Mock<IDeployEventRepository>();
            var mockAzureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
            var mockHubContext = MockHubContextFactory<EntityUpdatedHub, IEntityUpdateClient>();

            var service = new DeploymentPipelinePollingJob(
                mockAzureDevOpsBuildClient.Object,
                mockDeploymentRepository.Object,
                mockDeployEventRepository.Object,
                mockStorageAppMetadataClient.Object,
                mockHubContext.Object,
                Mock.Of<IPublisher>(),
                NullLogger<DeploymentPipelinePollingJob>.Instance,
                timeProvider,
                metrics
            );

            return new Fixture(
                service,
                mockStorageAppMetadataClient,
                mockDeploymentRepository,
                mockAzureDevOpsBuildClient
            );
        }
    }

    private static IJobExecutionContext JobExecutionContextFactory(
        PipelineType pipelineType,
        string? traceParent = null,
        string? traceState = null,
        string environment = "tt02"
    )
    {
        var mockJobExecutionContext = new Mock<IJobExecutionContext>();
        var mockJobDetail = new Mock<IJobDetail>();
        var jobDataMap = new JobDataMap
        {
            [SchedulerConstants.Org] = "testorg",
            [SchedulerConstants.App] = "testapp",
            [SchedulerConstants.Developer] = "testdeveloper",
            [SchedulerConstants.BuildId] = "12345",
            [SchedulerConstants.PipelineType] = pipelineType.ToString(),
            [SchedulerConstants.Environment] = environment,
        };

        if (!string.IsNullOrWhiteSpace(traceParent))
        {
            jobDataMap[SchedulerConstants.TraceParent] = traceParent;
        }

        if (!string.IsNullOrWhiteSpace(traceState))
        {
            jobDataMap[SchedulerConstants.TraceState] = traceState;
        }

        mockJobDetail.Setup(x => x.Key).Returns(JobKey.Create("testjob"));
        mockJobDetail.Setup(x => x.JobDataMap).Returns(jobDataMap);

        mockJobExecutionContext.Setup(x => x.JobDetail).Returns(mockJobDetail.Object);
        mockJobExecutionContext.Setup(x => x.Scheduler).Returns(Mock.Of<IScheduler>());

        return mockJobExecutionContext.Object;
    }

    private static Mock<IHubContext<THub, T>> MockHubContextFactory<THub, T>()
        where THub : Hub<T>
        where T : class
    {
        var mockEntityUpdateClient = new Mock<T>();
        var mockClients = new Mock<IHubClients<T>>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockEntityUpdateClient.Object);

        var mockHubContext = new Mock<IHubContext<THub, T>>();
        mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);

        return mockHubContext;
    }

    private static string CreateValidTraceParent()
    {
        using var activity = new Activity(nameof(DeploymentPipelinePollingJobTest));
        activity.SetIdFormat(ActivityIdFormat.W3C);
        activity.Start();
        var traceParent = activity.Id;
        if (string.IsNullOrWhiteSpace(traceParent))
        {
            throw new InvalidOperationException("Expected a non-empty W3C activity id.");
        }

        return traceParent;
    }
}
