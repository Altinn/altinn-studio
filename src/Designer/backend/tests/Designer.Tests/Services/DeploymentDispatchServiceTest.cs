#nullable enable
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using MediatR;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class DeploymentDispatchServiceTest
{
    [Fact]
    public async Task TryDispatchAsync_QueuesBuild_UpdatesDeployment_AddsEvent_AndPublishesPolling()
    {
        var fixture = Fixture.Create();
        var deployment = fixture.CreateDeployment();
        var claimedDispatch = fixture.CreateClaimedDispatch(deployment);
        var started = new DateTime(2026, 03, 05, 10, 15, 00, DateTimeKind.Utc);
        DeployPipelineQueueRequest? queueRequest = null;
        DeploymentEntity? updatedDeployment = null;
        DeployEvent? addedEvent = null;

        fixture
            .MockDeploymentRepository.Setup(x =>
                x.TryClaimPendingDispatch(
                    deployment.Org,
                    deployment.Build.Id,
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(claimedDispatch);
        fixture
            .MockReleaseRepository.Setup(x =>
                x.GetSucceededReleaseFromDb(deployment.Org, deployment.App, deployment.TagName)
            )
            .ReturnsAsync(new ReleaseEntity { TargetCommitish = "abc123" });
        fixture
            .MockApplicationInformationService.Setup(x =>
                x.UpdateApplicationInformationAsync(
                    deployment.Org,
                    deployment.App,
                    "abc123",
                    deployment.EnvName,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        fixture.MockFeatureManager.Setup(x => x.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy)).ReturnsAsync(false);
        fixture.MockEnvironmentsService.Setup(x => x.GetHostNameByEnvName(deployment.EnvName)).ReturnsAsync("host");
        fixture
            .MockDeployPipelineExecutor.Setup(x =>
                x.QueueAsync(It.IsAny<DeployPipelineQueueRequest>(), It.IsAny<CancellationToken>())
            )
            .Callback<DeployPipelineQueueRequest, CancellationToken>((captured, _) => queueRequest = captured)
            .ReturnsAsync(
                new Build
                {
                    Id = 42,
                    Status = BuildStatus.InProgress,
                    StartTime = started,
                }
            );
        fixture
            .MockDeploymentRepository.Setup(x => x.Update(It.IsAny<DeploymentEntity>(), true))
            .Callback<DeploymentEntity, bool>((captured, _) => updatedDeployment = captured)
            .Returns(Task.CompletedTask);
        fixture
            .MockDeployEventRepository.Setup(x =>
                x.AddAsync(deployment.Org, deployment.Build.Id, It.IsAny<DeployEvent>(), It.IsAny<CancellationToken>())
            )
            .Callback<string, string, DeployEvent, CancellationToken>((_, _, captured, _) => addedEvent = captured)
            .Returns(Task.CompletedTask);

        await fixture.Service.TryDispatchAsync(
            deployment.Org,
            deployment.Build.Id,
            Fixture.TraceParent,
            Fixture.TraceState,
            CancellationToken.None
        );

        Assert.NotNull(queueRequest);
        Assert.Equal(deployment.Org, queueRequest.Org);
        Assert.Equal(deployment.App, queueRequest.App);
        Assert.Equal(deployment.EnvName, queueRequest.Environment);
        Assert.Equal(deployment.TagName, queueRequest.TagName);
        Assert.Equal("abc123", queueRequest.AppCommitId);
        Assert.Equal("host", queueRequest.Hostname);
        Assert.Equal(Fixture.AppDeployToken, queueRequest.AppDeployToken);
        Assert.False(queueRequest.UseGitOpsDefinition);
        Assert.False(queueRequest.ShouldPushSyncRootImage);
        Assert.Equal(Fixture.TraceParent, queueRequest.TraceParent);
        Assert.Equal(Fixture.TraceState, queueRequest.TraceState);

        Assert.NotNull(updatedDeployment);
        Assert.Equal("42", updatedDeployment.Build.ExternalId);
        Assert.Equal(BuildStatus.InProgress, updatedDeployment.Build.Status);
        Assert.Equal(BuildResult.None, updatedDeployment.Build.Result);
        Assert.Equal(started, updatedDeployment.Build.Started);

        Assert.NotNull(addedEvent);
        Assert.Equal(DeployEventType.PipelineScheduled, addedEvent.EventType);
        Assert.Contains("42", addedEvent.Message);

        fixture.MockMediator.Verify(
            x =>
                x.Publish(
                    It.Is<DeploymentPipelineQueued>(n =>
                        n.EditingContext.Org == deployment.Org
                        && n.EditingContext.Repo == deployment.App
                        && n.EditingContext.Developer == deployment.CreatedBy
                        && n.WorkflowId == deployment.Build.Id
                        && n.ExternalBuildId == 42
                        && n.PipelineType == PipelineType.Deploy
                        && n.Environment == deployment.EnvName
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        fixture.MockEntityUpdateClient.Verify(
            x => x.EntityUpdated(It.Is<EntityUpdated>(n => n.ResourceName == EntityConstants.Deployment)),
            Times.Once
        );
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task TryDispatchAsync_WithGitOpsEnabled_SetsPushSyncRootImageFromAppPresence(
        bool appAlreadyExists,
        bool expectedPushSyncRootImage
    )
    {
        var fixture = Fixture.Create();
        var deployment = fixture.CreateDeployment();
        var claimedDispatch = fixture.CreateClaimedDispatch(deployment);
        DeployPipelineQueueRequest? queueRequest = null;

        fixture
            .MockDeploymentRepository.Setup(x =>
                x.TryClaimPendingDispatch(
                    deployment.Org,
                    deployment.Build.Id,
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(claimedDispatch);
        fixture
            .MockReleaseRepository.Setup(x =>
                x.GetSucceededReleaseFromDb(deployment.Org, deployment.App, deployment.TagName)
            )
            .ReturnsAsync(new ReleaseEntity { TargetCommitish = "abc123" });
        fixture
            .MockApplicationInformationService.Setup(x =>
                x.UpdateApplicationInformationAsync(
                    deployment.Org,
                    deployment.App,
                    "abc123",
                    deployment.EnvName,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        fixture.MockFeatureManager.Setup(x => x.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy)).ReturnsAsync(true);
        fixture.MockEnvironmentsService.Setup(x => x.GetHostNameByEnvName(deployment.EnvName)).ReturnsAsync("host");
        fixture
            .MockGitOpsConfigurationManager.Setup(x =>
                x.EnsureGitOpsConfigurationExistsAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                )
            )
            .Returns(Task.CompletedTask);
        fixture
            .MockGitOpsConfigurationManager.Setup(x =>
                x.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(repo => repo.Name == deployment.App),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                )
            )
            .ReturnsAsync(appAlreadyExists);
        fixture
            .MockGitOpsConfigurationManager.Setup(x =>
                x.AddAppToGitOpsConfigurationAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                )
            )
            .Returns(Task.CompletedTask);
        fixture
            .MockDeployPipelineExecutor.Setup(x =>
                x.QueueAsync(It.IsAny<DeployPipelineQueueRequest>(), It.IsAny<CancellationToken>())
            )
            .Callback<DeployPipelineQueueRequest, CancellationToken>((captured, _) => queueRequest = captured)
            .ReturnsAsync(
                new Build
                {
                    Id = 42,
                    Status = BuildStatus.InProgress,
                    StartTime = fixture.TimeProvider.GetUtcNow().UtcDateTime,
                }
            );
        fixture
            .MockDeploymentRepository.Setup(x => x.Update(It.IsAny<DeploymentEntity>(), true))
            .Returns(Task.CompletedTask);
        fixture
            .MockDeployEventRepository.Setup(x =>
                x.AddAsync(deployment.Org, deployment.Build.Id, It.IsAny<DeployEvent>(), It.IsAny<CancellationToken>())
            )
            .Returns(Task.CompletedTask);

        await fixture.Service.TryDispatchAsync(
            deployment.Org,
            deployment.Build.Id,
            Fixture.TraceParent,
            Fixture.TraceState,
            CancellationToken.None
        );

        Assert.NotNull(queueRequest);
        Assert.True(queueRequest.UseGitOpsDefinition);
        Assert.Equal(expectedPushSyncRootImage, queueRequest.ShouldPushSyncRootImage);

        fixture.MockGitOpsConfigurationManager.Verify(
            x =>
                x.EnsureGitOpsConfigurationExistsAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                ),
            Times.Once
        );
        fixture.MockGitOpsConfigurationManager.Verify(
            x =>
                x.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(repo => repo.Name == deployment.App),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                ),
            Times.Once
        );
        fixture.MockGitOpsConfigurationManager.Verify(
            x =>
                x.AddAppToGitOpsConfigurationAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                ),
            appAlreadyExists ? Times.Never() : Times.Once()
        );
        fixture.MockGitOpsConfigurationManager.Verify(
            x =>
                x.PersistGitOpsConfiguration(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnEnvironment>(env => env.Name == deployment.EnvName)
                ),
            appAlreadyExists ? Times.Never() : Times.Once()
        );
    }

    [Fact]
    public async Task TryDispatchAsync_WhenQueueingFails_MarksDeploymentFailed_AndNotifies()
    {
        var fixture = Fixture.Create();
        var deployment = fixture.CreateDeployment();
        var claimedDispatch = fixture.CreateClaimedDispatch(deployment);
        DeploymentEntity? updatedDeployment = null;

        fixture
            .MockDeploymentRepository.Setup(x =>
                x.TryClaimPendingDispatch(
                    deployment.Org,
                    deployment.Build.Id,
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(claimedDispatch);
        fixture
            .MockReleaseRepository.Setup(x =>
                x.GetSucceededReleaseFromDb(deployment.Org, deployment.App, deployment.TagName)
            )
            .ReturnsAsync(new ReleaseEntity { TargetCommitish = "abc123" });
        fixture
            .MockApplicationInformationService.Setup(x =>
                x.UpdateApplicationInformationAsync(
                    deployment.Org,
                    deployment.App,
                    "abc123",
                    deployment.EnvName,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        fixture.MockFeatureManager.Setup(x => x.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy)).ReturnsAsync(false);
        fixture.MockEnvironmentsService.Setup(x => x.GetHostNameByEnvName(deployment.EnvName)).ReturnsAsync("host");
        fixture
            .MockDeployPipelineExecutor.Setup(x =>
                x.QueueAsync(It.IsAny<DeployPipelineQueueRequest>(), It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(new InvalidOperationException("queue failed"));
        fixture
            .MockDeploymentRepository.Setup(x => x.Update(It.IsAny<DeploymentEntity>(), true))
            .Callback<DeploymentEntity, bool>((captured, _) => updatedDeployment = captured)
            .Returns(Task.CompletedTask);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            fixture.Service.TryDispatchAsync(
                deployment.Org,
                deployment.Build.Id,
                Fixture.TraceParent,
                Fixture.TraceState,
                CancellationToken.None
            )
        );

        Assert.NotNull(updatedDeployment);
        Assert.Equal(BuildStatus.Completed, updatedDeployment.Build.Status);
        Assert.Equal(BuildResult.Failed, updatedDeployment.Build.Result);
        Assert.Equal(fixture.TimeProvider.GetUtcNow().UtcDateTime, updatedDeployment.Build.Finished);
        Assert.Null(updatedDeployment.Build.ExternalId);

        fixture.MockDeployEventRepository.Verify(
            x =>
                x.AddAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<DeployEvent>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        fixture.MockMediator.Verify(
            x => x.Publish(It.IsAny<DeploymentPipelineQueued>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        fixture.MockEntityUpdateClient.Verify(
            x => x.EntityUpdated(It.Is<EntityUpdated>(n => n.ResourceName == EntityConstants.Deployment)),
            Times.Once
        );
    }

    [Fact]
    public async Task DispatchPendingAsync_ClaimsBatchAndDispatchesWithoutTraceContext()
    {
        var fixture = Fixture.Create();
        var deployment = fixture.CreateDeployment();
        var claimedDispatch = fixture.CreateClaimedDispatch(deployment);
        DeployPipelineQueueRequest? queueRequest = null;

        fixture
            .MockDeploymentRepository.Setup(x =>
                x.ClaimPendingDispatches(
                    DeploymentDispatchSweeperJobConstants.BatchSize,
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([claimedDispatch]);
        fixture
            .MockReleaseRepository.Setup(x =>
                x.GetSucceededReleaseFromDb(deployment.Org, deployment.App, deployment.TagName)
            )
            .ReturnsAsync(new ReleaseEntity { TargetCommitish = "abc123" });
        fixture
            .MockApplicationInformationService.Setup(x =>
                x.UpdateApplicationInformationAsync(
                    deployment.Org,
                    deployment.App,
                    "abc123",
                    deployment.EnvName,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        fixture.MockFeatureManager.Setup(x => x.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy)).ReturnsAsync(false);
        fixture.MockEnvironmentsService.Setup(x => x.GetHostNameByEnvName(deployment.EnvName)).ReturnsAsync("host");
        fixture
            .MockDeployPipelineExecutor.Setup(x =>
                x.QueueAsync(It.IsAny<DeployPipelineQueueRequest>(), It.IsAny<CancellationToken>())
            )
            .Callback<DeployPipelineQueueRequest, CancellationToken>((captured, _) => queueRequest = captured)
            .ReturnsAsync(
                new Build
                {
                    Id = 42,
                    Status = BuildStatus.InProgress,
                    StartTime = fixture.TimeProvider.GetUtcNow().UtcDateTime,
                }
            );
        fixture
            .MockDeploymentRepository.Setup(x => x.Update(It.IsAny<DeploymentEntity>(), true))
            .Returns(Task.CompletedTask);
        fixture
            .MockDeployEventRepository.Setup(x =>
                x.AddAsync(deployment.Org, deployment.Build.Id, It.IsAny<DeployEvent>(), It.IsAny<CancellationToken>())
            )
            .Returns(Task.CompletedTask);

        await fixture.Service.DispatchPendingAsync(CancellationToken.None);

        Assert.NotNull(queueRequest);
        Assert.Null(queueRequest.TraceParent);
        Assert.Null(queueRequest.TraceState);
    }

    private sealed record Fixture(
        DeploymentDispatchService Service,
        FakeTimeProvider TimeProvider,
        Mock<IDeploymentRepository> MockDeploymentRepository,
        Mock<IReleaseRepository> MockReleaseRepository,
        Mock<IApplicationInformationService> MockApplicationInformationService,
        Mock<IEnvironmentsService> MockEnvironmentsService,
        Mock<IDeployPipelineExecutor> MockDeployPipelineExecutor,
        Mock<IDeployEventRepository> MockDeployEventRepository,
        Mock<IPublisher> MockMediator,
        Mock<IGitOpsConfigurationManager> MockGitOpsConfigurationManager,
        Mock<IFeatureManager> MockFeatureManager,
        Mock<IEntityUpdateClient> MockEntityUpdateClient,
        IDataProtectionProvider DataProtectionProvider
    )
    {
        public const string AppDeployToken = "token";
        public const string TraceParent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
        public const string TraceState = "key=value";

        public static Fixture Create()
        {
            var mockDeploymentRepository = new Mock<IDeploymentRepository>();
            var mockReleaseRepository = new Mock<IReleaseRepository>();
            var mockApplicationInformationService = new Mock<IApplicationInformationService>();
            var mockEnvironmentsService = new Mock<IEnvironmentsService>();
            var mockDeployPipelineExecutor = new Mock<IDeployPipelineExecutor>();
            var mockDeployEventRepository = new Mock<IDeployEventRepository>();
            var mockMediator = new Mock<IPublisher>();
            var mockGitOpsConfigurationManager = new Mock<IGitOpsConfigurationManager>();
            var mockFeatureManager = new Mock<IFeatureManager>();
            var mockEntityUpdateClient = new Mock<IEntityUpdateClient>();

            var mockHubClients = new Mock<IHubClients<IEntityUpdateClient>>();
            mockHubClients.Setup(x => x.Group(It.IsAny<string>())).Returns(mockEntityUpdateClient.Object);

            var mockHubContext = new Mock<IHubContext<EntityUpdatedHub, IEntityUpdateClient>>();
            mockHubContext.Setup(x => x.Clients).Returns(mockHubClients.Object);

            var timeProvider = new FakeTimeProvider();
            timeProvider.SetUtcNow(new DateTimeOffset(2026, 03, 05, 12, 00, 00, TimeSpan.Zero));
            var dataProtectionProvider = Microsoft.AspNetCore.DataProtection.DataProtectionProvider.Create(
                new DirectoryInfo(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N")))
            );

            var service = new DeploymentDispatchService(
                mockDeploymentRepository.Object,
                mockReleaseRepository.Object,
                mockApplicationInformationService.Object,
                mockEnvironmentsService.Object,
                mockDeployPipelineExecutor.Object,
                mockDeployEventRepository.Object,
                mockHubContext.Object,
                mockMediator.Object,
                new GeneralSettings { HostName = "studio.test" },
                timeProvider,
                mockGitOpsConfigurationManager.Object,
                mockFeatureManager.Object,
                dataProtectionProvider,
                NullLogger<DeploymentDispatchService>.Instance
            );

            return new Fixture(
                service,
                timeProvider,
                mockDeploymentRepository,
                mockReleaseRepository,
                mockApplicationInformationService,
                mockEnvironmentsService,
                mockDeployPipelineExecutor,
                mockDeployEventRepository,
                mockMediator,
                mockGitOpsConfigurationManager,
                mockFeatureManager,
                mockEntityUpdateClient,
                dataProtectionProvider
            );
        }

        public ClaimedDeploymentDispatch CreateClaimedDispatch(DeploymentEntity deployment) =>
            new()
            {
                Deployment = deployment,
                ProtectedAppDeployToken = DataProtectionProvider
                    .CreateProtector(DeploymentDispatchTokenProtection.Purpose)
                    .Protect(AppDeployToken),
            };

        public DeploymentEntity CreateDeployment() =>
            new()
            {
                Org = "ttd",
                App = "app",
                EnvName = "at23",
                TagName = "v1",
                CreatedBy = "testuser",
                Build = new BuildEntity
                {
                    Id = "workflow-1",
                    Status = BuildStatus.NotStarted,
                    Result = BuildResult.None,
                },
            };
    }
}
