#nullable enable
using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Newtonsoft.Json;
using Quartz;
using Xunit;
using SchedulerConstants = Altinn.Studio.Designer.Scheduling.DeploymentPipelinePollingJobConstants.Arguments;

namespace Designer.Tests.Scheduling;

public class DeploymentPipelinePollingJobTest
{
    [Fact]
    public async Task Execute_Undeploy_UpdatesJsonData_PassesPayloadToStorageClient()
    {
        // Arrange
        var fixture = Fixture.Create();
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
        Assert.Equal(
            nameof(AppStatus.Deprecated),
            JsonNode.Parse(capturedAppMetadataJson)?["status"]?.GetValue<string>()
        );
    }

    [Fact]
    public async Task Execute_UndeploySucceeded_SetsDeprecatedStatusInResourceRegistry()
    {
        // Arrange
        var fixture = Fixture.Create();
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Undeploy);
        SetupCompletedBuild(fixture, BuildResult.Succeeded);

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockApplicationInformationService.Verify(
            x => x.UpdateResourceRegistryStatusAsync("testorg", "testapp", "tt02", AppStatus.Deprecated),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_UndeploySucceeded_ResourceRegistryUpdateFails_StillPublishesCompletedEvent()
    {
        // Arrange
        var fixture = Fixture.Create();
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Undeploy);
        SetupCompletedBuild(fixture, BuildResult.Succeeded);
        fixture
            .MockApplicationInformationService.Setup(x =>
                x.UpdateResourceRegistryStatusAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AppStatus>()
                )
            )
            .ReturnsAsync(new ResourceRegistryPublishResult(false, "Resource not found"));

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockPublisher.Verify(
            x =>
                x.Publish(
                    It.Is<DeploymentPipelineCompleted>(e => e.PipelineType == PipelineType.Undeploy && e.Succeeded),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    [InlineData(PipelineType.Deploy, BuildResult.Succeeded)]
    [InlineData(PipelineType.Undeploy, BuildResult.Failed)]
    public async Task Execute_NotSucceededUndeploy_DoesNotUpdateResourceRegistryStatus(
        PipelineType pipelineType,
        BuildResult buildResult
    )
    {
        // Arrange
        var fixture = Fixture.Create();
        var jobExecutionContext = JobExecutionContextFactory(pipelineType);
        SetupCompletedBuild(fixture, buildResult);

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockApplicationInformationService.Verify(
            x =>
                x.UpdateResourceRegistryStatusAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AppStatus>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_UndeploySucceeded_AppDeployedAgainAfterUndeploy_SkipsDeprecation()
    {
        // Arrange
        var fixture = Fixture.Create();
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Undeploy);
        DateTime undeployRequested = DateTime.UtcNow.AddMinutes(-10);
        SetupCompletedBuild(fixture, BuildResult.Succeeded, decommissionCreated: undeployRequested);
        fixture
            .MockDeploymentRepository.Setup(x => x.GetLatestDeploy("testorg", "testapp", "tt02"))
            .ReturnsAsync(new DeploymentEntity { Created = undeployRequested.AddMinutes(5) });

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockStorageAppMetadataClient.Verify(
            x =>
                x.UpsertApplicationMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                ),
            Times.Never
        );
        fixture.MockApplicationInformationService.Verify(
            x =>
                x.UpdateResourceRegistryStatusAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AppStatus>()
                ),
            Times.Never
        );
        fixture.MockPublisher.Verify(
            x =>
                x.Publish(
                    It.Is<DeploymentPipelineCompleted>(e => e.PipelineType == PipelineType.Undeploy && e.Succeeded),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_UndeploySucceeded_LatestDeployBeforeUndeploy_SetsDeprecatedStatus()
    {
        // Arrange
        var fixture = Fixture.Create();
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Undeploy);
        DateTime undeployRequested = DateTime.UtcNow.AddMinutes(-10);
        SetupCompletedBuild(fixture, BuildResult.Succeeded, decommissionCreated: undeployRequested);
        fixture
            .MockDeploymentRepository.Setup(x => x.GetLatestDeploy("testorg", "testapp", "tt02"))
            .ReturnsAsync(new DeploymentEntity { Created = undeployRequested.AddDays(-1) });

        // Act
        await fixture.Service.Execute(jobExecutionContext);

        // Assert
        fixture.MockApplicationInformationService.Verify(
            x => x.UpdateResourceRegistryStatusAsync("testorg", "testapp", "tt02", AppStatus.Deprecated),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_UndeploySucceeded_StorageUpdateFails_StillSetsDeprecatedStatusInResourceRegistry()
    {
        // Arrange
        var fixture = Fixture.Create();
        var jobExecutionContext = JobExecutionContextFactory(PipelineType.Undeploy);
        SetupCompletedBuild(fixture, BuildResult.Succeeded);
        fixture
            .MockStorageAppMetadataClient.Setup(x =>
                x.UpsertApplicationMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                )
            )
            .ThrowsAsync(new HttpRequestException("Storage unavailable"));

        // Act
        await Assert.ThrowsAsync<HttpRequestException>(() => fixture.Service.Execute(jobExecutionContext));

        // Assert
        fixture.MockApplicationInformationService.Verify(
            x => x.UpdateResourceRegistryStatusAsync("testorg", "testapp", "tt02", AppStatus.Deprecated),
            Times.Once
        );
    }

    private static void SetupCompletedBuild(
        Fixture fixture,
        BuildResult buildResult,
        DateTime? decommissionCreated = null
    )
    {
        fixture
            .MockStorageAppMetadataClient.Setup(x =>
                x.GetApplicationMetadataJsonAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonConvert.SerializeObject(new ApplicationMetadata("testorg/testapp")));

        fixture
            .MockAzureDevOpsBuildClient.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BuildEntity { Status = BuildStatus.Completed, Result = buildResult });

        fixture
            .MockDeploymentRepository.Setup(x => x.Get(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(
                new DeploymentEntity
                {
                    Build = new BuildEntity { Status = BuildStatus.None },
                    Created = decommissionCreated ?? DateTime.UtcNow,
                }
            );
    }

    [Fact]
    public async Task Execute_WithTraceParentWithoutTraceState_DoesNotThrow()
    {
        // Arrange
        var fixture = Fixture.Create();
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
        var fixture = Fixture.Create();
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

    private sealed record Fixture(
        DeploymentPipelinePollingJob DeploymentPipelinePollingJob,
        Mock<IAltinnStorageAppMetadataClient> MockStorageAppMetadataClient,
        Mock<IDeploymentRepository> MockDeploymentRepository,
        Mock<IAzureDevOpsBuildClient> MockAzureDevOpsBuildClient,
        Mock<IApplicationInformationService> MockApplicationInformationService,
        Mock<IPublisher> MockPublisher
    )
    {
        public DeploymentPipelinePollingJob Service => DeploymentPipelinePollingJob;

        public static Fixture Create()
        {
            var mockStorageAppMetadataClient = new Mock<IAltinnStorageAppMetadataClient>();
            var mockDeploymentRepository = new Mock<IDeploymentRepository>();
            var mockDeployEventRepository = new Mock<IDeployEventRepository>();
            var mockAzureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
            var mockHubContext = MockHubContextFactory<EntityUpdatedHub, IEntityUpdateClient>();
            var mockPublisher = new Mock<IPublisher>();
            var mockApplicationInformationService = new Mock<IApplicationInformationService>();
            mockApplicationInformationService
                .Setup(x =>
                    x.UpdateResourceRegistryStatusAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<AppStatus>()
                    )
                )
                .ReturnsAsync(new ResourceRegistryPublishResult(true));

            var service = new DeploymentPipelinePollingJob(
                mockAzureDevOpsBuildClient.Object,
                mockDeploymentRepository.Object,
                mockDeployEventRepository.Object,
                mockStorageAppMetadataClient.Object,
                mockApplicationInformationService.Object,
                mockHubContext.Object,
                mockPublisher.Object,
                NullLogger<DeploymentPipelinePollingJob>.Instance,
                TimeProvider.System
            );

            return new Fixture(
                service,
                mockStorageAppMetadataClient,
                mockDeploymentRepository,
                mockAzureDevOpsBuildClient,
                mockApplicationInformationService,
                mockPublisher
            );
        }
    }

    private static IJobExecutionContext JobExecutionContextFactory(
        PipelineType pipelineType,
        string? traceParent = null,
        string? traceState = null
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
            [SchedulerConstants.Environment] = "tt02",
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
