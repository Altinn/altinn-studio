using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Utils;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Microsoft.FeatureManagement;
using Moq;
using Newtonsoft.Json;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Services
{
    public class DeploymentServiceTest
    {
        private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
        private readonly Mock<IDeploymentRepository> _deploymentRepository;
        private readonly Mock<IDeployEventRepository> _deployEventRepository;
        private readonly Mock<ILogger<DeploymentService>> _deploymentLogger;
        private readonly Mock<IReleaseRepository> _releaseRepository;
        private readonly Mock<IApplicationInformationService> _applicationInformationService;
        private readonly Mock<IEnvironmentsService> _environementsService;
        private readonly Mock<IAzureDevOpsBuildClient> _azureDevOpsBuildClient;
        private readonly Mock<IPublisher> _mediatrMock;
        private readonly Mock<IGitOpsConfigurationManager> _gitOpsConfigurationManager;
        private readonly Mock<IFeatureManager> _featureManager;
        private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient;
        private readonly GeneralSettings _generalSettings;
        private readonly FakeTimeProvider _fakeTimeProvider;
        private readonly Mock<ISlackClient> _slackClient;
        private readonly AlertsSettings _alertsSettings;

        public DeploymentServiceTest(ITestOutputHelper testOutputHelper)
        {
            _httpContextAccessor = AuthenticationUtil.GetAuthenticatedHttpContextAccessor();
            _deploymentLogger = new Mock<ILogger<DeploymentService>>();
            _deploymentRepository = new Mock<IDeploymentRepository>();
            _deployEventRepository = new Mock<IDeployEventRepository>();
            _releaseRepository = new Mock<IReleaseRepository>();
            _environementsService = new Mock<IEnvironmentsService>();
            _azureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
            _environementsService.Setup(req => req.GetEnvironments())
                .ReturnsAsync(GetEnvironments("environments.json"));
            _applicationInformationService = new Mock<IApplicationInformationService>();
            _mediatrMock = new Mock<IPublisher>();
            _gitOpsConfigurationManager = new Mock<IGitOpsConfigurationManager>();
            _featureManager = new Mock<IFeatureManager>();
            _runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
            _generalSettings = new GeneralSettings();
            _fakeTimeProvider = new FakeTimeProvider();
            _slackClient = new Mock<ISlackClient>();
            _alertsSettings = new AlertsSettings();
        }

        [Theory]
        [InlineData("ttd", "apps-test-tba")]
        [InlineData("ttd", "new-app")]
        public async Task CreateAsync_OK(string org, string app)
        {
            // Arrange
            DeploymentModel deploymentModel = new() { TagName = "1", EnvName = "at23" };

            _releaseRepository.Setup(r => r.GetSucceededReleaseFromDb(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>())).ReturnsAsync(GetReleases("updatedRelease.json").First());

            _applicationInformationService.Setup(ais => ais.UpdateApplicationInformationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<QueueBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());
            // Setup get deployments
            _deploymentRepository.Setup(r => r.Get(
                org,
                app,
                It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetDeployments("createdDeployment.json").Where(d => d.Org == org && d.App == app));

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            DeploymentEntity deploymentEntity =
                await deploymentService.CreateAsync(authenticatedContext, deploymentModel);

            // Assert
            Assert.NotNull(deploymentEntity);

            var properties = deploymentEntity.GetType().GetProperties();
            foreach (var property in properties)
            {
                Assert.NotNull(property.GetValue(deploymentEntity));
            }

            _releaseRepository.Verify(
                r => r.GetSucceededReleaseFromDb(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
                Times.Once);
            _applicationInformationService.Verify(
                ais => ais.UpdateApplicationInformationAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()),
                Times.Once);
            _azureDevOpsBuildClient.Verify(
                b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>()), Times.Once);
            _deploymentRepository.Verify(r => r.Create(It.IsAny<DeploymentEntity>()), Times.Once);

            _mediatrMock.Verify(m => m.Publish(It.Is<DeploymentPipelineQueued>(n =>
                n.EditingContext.Org == org &&
                n.EditingContext.Repo == app &&
                n.Environment == deploymentModel.EnvName &&
                n.PipelineType == PipelineType.Deploy), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_WithW3cActivity_SetsAlwaysSamplingTag()
        {
            // Arrange
            const string Org = "ttd";
            const string App = "test-app";
            DeploymentModel deploymentModel = new() { TagName = "1", EnvName = "at23" };

            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(false);

            _releaseRepository.Setup(r => r.GetSucceededReleaseFromDb(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>())).ReturnsAsync(GetReleases("updatedRelease.json").First());

            _applicationInformationService.Setup(ais => ais.UpdateApplicationInformationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<QueueBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());
            _deploymentRepository.Setup(r => r.Get(
                Org,
                App,
                It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetDeployments("createdDeployment.json").Where(d => d.Org == Org && d.App == App));

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(Org, App, "testUser", "dummyToken");
            using var activity = new Activity("test-create");
            activity.SetIdFormat(ActivityIdFormat.W3C);
            activity.Start();

            // Act
            await deploymentService.CreateAsync(authenticatedContext, deploymentModel);

            // Assert
            Assert.Equal("always", activity.GetTagItem("altinn.studio.sampling"));
        }

        [Theory]
        [InlineData("ttd", "issue-6094")]
        public async Task GetAsync_OK(string org, string app)
        {
            // Arrange
            var environments = GetEnvironments("environments.json");
            _environementsService.Setup(e => e.GetOrganizationEnvironments(org)).ReturnsAsync(environments);
            var pipelineDeployments = GetDeployments("completedDeployments.json");
            _deploymentRepository.Setup(r => r.Get(org, app, It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(pipelineDeployments);

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            // Act
            SearchResults<DeploymentEntity> results =
                await deploymentService.GetAsync(org, app, new DocumentQueryModel());

            // Assert
            Assert.Equal(8, results.Results.Count());
            _deploymentRepository.Verify(r => r.Get(org, app, It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "test-app")]
        public async Task CreateAsync_WithGitOpsFeatureEnabled_AppDoesNotExist_ShouldAddAppToGitOps_AndSetPushSyncRootImageTrue(string org, string app)
        {
            // Arrange
            DeploymentModel deploymentModel = new() { TagName = "1", EnvName = "at23" };

            // Setup GitOps feature flag enabled
            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(true);

            // Setup GitOps configuration manager - app does not exist
            _gitOpsConfigurationManager.Setup(gm => gm.EnsureGitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>())).Returns(Task.CompletedTask);

            _gitOpsConfigurationManager.Setup(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>())).ReturnsAsync(false);

            _gitOpsConfigurationManager.Setup(gm => gm.AddAppToGitOpsConfigurationAsync(
                It.IsAny<AltinnRepoEditingContext>(),
                It.IsAny<AltinnEnvironment>())).Returns(Task.CompletedTask);

            _gitOpsConfigurationManager.Setup(gm => gm.PersistGitOpsConfiguration(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>()));

            _releaseRepository.Setup(r => r.GetSucceededReleaseFromDb(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>())).ReturnsAsync(GetReleases("updatedRelease.json").First());

            _applicationInformationService.Setup(ais => ais.UpdateApplicationInformationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<QueueBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _deploymentRepository.Setup(r => r.Get(
                org,
                app,
                It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetDeployments("createdDeployment.json").Where(d => d.Org == org && d.App == app));

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.CreateAsync(authenticatedContext, deploymentModel);

            // Assert - feature flag is checked twice (once for GitOps logic, once for definition selection)
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Exactly(2));

            _gitOpsConfigurationManager.Verify(gm => gm.EnsureGitOpsConfigurationExistsAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnEnvironment>(env => env.Name == deploymentModel.EnvName)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnRepoName>(repo => repo.Name == app),
                It.Is<AltinnEnvironment>(env => env.Name == deploymentModel.EnvName)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.AddAppToGitOpsConfigurationAsync(
                It.Is<AltinnRepoEditingContext>(ctx => ctx.Org == org && ctx.Repo == app),
                It.Is<AltinnEnvironment>(env => env.Name == deploymentModel.EnvName)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.PersistGitOpsConfiguration(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnEnvironment>(env => env.Name == deploymentModel.EnvName)), Times.Once);

            var azureDevOpsSettings = GetAzureDevOpsSettings();
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.Is<QueueBuildParameters>(qbp => qbp.PushSyncRootGitopsImage == "true"),
                azureDevOpsSettings.GitOpsManagerDefinitionId), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "test-app")]
        public async Task CreateAsync_WithGitOpsFeatureEnabled_AppAlreadyExists_ShouldNotAddAppToGitOps_AndSetPushSyncRootImageFalse(string org, string app)
        {
            // Arrange
            DeploymentModel deploymentModel = new() { TagName = "1", EnvName = "at23" };

            // Setup GitOps feature flag enabled
            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(true);

            // Setup GitOps configuration manager - app already exists
            _gitOpsConfigurationManager.Setup(gm => gm.EnsureGitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>())).Returns(Task.CompletedTask);

            _gitOpsConfigurationManager.Setup(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>())).ReturnsAsync(true);

            _releaseRepository.Setup(r => r.GetSucceededReleaseFromDb(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>())).ReturnsAsync(GetReleases("updatedRelease.json").First());

            _applicationInformationService.Setup(ais => ais.UpdateApplicationInformationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<QueueBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _deploymentRepository.Setup(r => r.Get(
                org,
                app,
                It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetDeployments("createdDeployment.json").Where(d => d.Org == org && d.App == app));

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.CreateAsync(authenticatedContext, deploymentModel);

            // Assert - feature flag is checked twice (once for GitOps logic, once for definition selection)
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Exactly(2));

            _gitOpsConfigurationManager.Verify(gm => gm.EnsureGitOpsConfigurationExistsAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnEnvironment>(env => env.Name == deploymentModel.EnvName)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnRepoName>(repo => repo.Name == app),
                It.Is<AltinnEnvironment>(env => env.Name == deploymentModel.EnvName)), Times.Once);

            // Should NOT add app or persist since app already exists
            _gitOpsConfigurationManager.Verify(gm => gm.AddAppToGitOpsConfigurationAsync(
                It.IsAny<AltinnRepoEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.PersistGitOpsConfiguration(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            // Should use GitOpsManagerDefinitionId when GitOps is enabled
            var azureDevOpsSettings = GetAzureDevOpsSettings();
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.Is<QueueBuildParameters>(qbp => qbp.PushSyncRootGitopsImage == "false"),
                azureDevOpsSettings.GitOpsManagerDefinitionId), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "test-app")]
        public async Task CreateAsync_WithGitOpsFeatureDisabled_ShouldNotCallAnyGitOpsMethods_AndSetPushSyncRootImageFalse(string org, string app)
        {
            // Arrange
            DeploymentModel deploymentModel = new() { TagName = "1", EnvName = "at23" };

            // Setup GitOps feature flag disabled
            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(false);

            _releaseRepository.Setup(r => r.GetSucceededReleaseFromDb(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>())).ReturnsAsync(GetReleases("updatedRelease.json").First());

            _applicationInformationService.Setup(ais => ais.UpdateApplicationInformationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<QueueBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _deploymentRepository.Setup(r => r.Get(
                org,
                app,
                It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetDeployments("createdDeployment.json").Where(d => d.Org == org && d.App == app));

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.CreateAsync(authenticatedContext, deploymentModel);

            // Assert - feature flag is checked twice (once for GitOps logic, once for definition selection)
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Exactly(2));

            // Verify NO GitOps methods are called when feature is disabled
            _gitOpsConfigurationManager.Verify(gm => gm.EnsureGitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.AddAppToGitOpsConfigurationAsync(
                It.IsAny<AltinnRepoEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.PersistGitOpsConfiguration(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            // Should use DeployDefinitionId when GitOps is disabled
            var azureDevOpsSettings = GetAzureDevOpsSettings();
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.Is<QueueBuildParameters>(qbp => qbp.PushSyncRootGitopsImage == "false"),
                azureDevOpsSettings.DeployDefinitionId), Times.Once);
        }

        private static List<ReleaseEntity> GetReleases(string filename)
        {
            string unitTestFolder =
                Path.GetDirectoryName(new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "ReleasesCollection", filename);
            if (File.Exists(path))
            {
                string releases = File.ReadAllText(path);
                return JsonConvert.DeserializeObject<List<ReleaseEntity>>(releases);
            }

            return null;
        }

        private static List<DeploymentEntity> GetDeployments(string filename)
        {
            string unitTestFolder =
                Path.GetDirectoryName(new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Deployments", filename);
            if (!File.Exists(path))
            {
                return null;
            }

            string deployments = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<List<DeploymentEntity>>(deployments);
        }

        private static List<EnvironmentModel> GetEnvironments(string filename)
        {
            string unitTestFolder =
                Path.GetDirectoryName(new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "..", "..", "..", "development",
                "azure-devops-mock", filename);
            if (File.Exists(path))
            {
                string environments = File.ReadAllText(path);
                EnvironmentsModel environmentsList =
                    System.Text.Json.JsonSerializer.Deserialize<EnvironmentsModel>(environments);

                return environmentsList.Environments;
            }

            return null;
        }


        private static Build GetBuild()
        {
            return new Build { Id = 1, Status = BuildStatus.InProgress, StartTime = DateTime.Now };
        }

        [Theory]
        [InlineData("ttd", "test-app", "at23")]
        public async Task UndeployAsync_WithGitOpsFeatureDisabled_ShouldUseDecommissionDefinitionId(string org, string app, string env)
        {
            // Arrange
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, "testUser");

            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(false);

            _deploymentRepository.Setup(r => r.GetLastDeployed(org, app, env))
                .ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            var azureDevOpsSettings = GetAzureDevOpsSettings();

            DeploymentService deploymentService = new(
                azureDevOpsSettings,
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.UndeployAsync(authenticatedContext, env);

            // Assert
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Once);

            // Should NOT call any GitOps methods
            _gitOpsConfigurationManager.Verify(gm => gm.GitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                It.IsAny<AltinnRepoEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            // Should use DecommissionDefinitionId
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                azureDevOpsSettings.DecommissionDefinitionId), Times.Once);

            _mediatrMock.Verify(m => m.Publish(It.Is<DeploymentPipelineQueued>(n =>
                n.EditingContext.Org == org &&
                n.EditingContext.Repo == app &&
                n.Environment == env &&
                n.PipelineType == PipelineType.Undeploy), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "test-app", "at23")]
        public async Task UndeployAsync_WithGitOpsFeatureEnabled_AppExistsInGitOps_ShouldRemoveAppAndUseGitOpsManagerDefinitionId(string org, string app, string env)
        {
            // Arrange
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, "testUser");

            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(true);

            _gitOpsConfigurationManager.Setup(gm => gm.GitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>())).ReturnsAsync(true);

            _gitOpsConfigurationManager.Setup(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>())).ReturnsAsync(true);

            _gitOpsConfigurationManager.Setup(gm => gm.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                It.IsAny<AltinnRepoEditingContext>(),
                It.IsAny<AltinnEnvironment>())).Returns(Task.CompletedTask);

            _gitOpsConfigurationManager.Setup(gm => gm.PersistGitOpsConfiguration(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>()));

            _deploymentRepository.Setup(r => r.GetLastDeployed(org, app, env))
                .ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            var azureDevOpsSettings = GetAzureDevOpsSettings();

            DeploymentService deploymentService = new(
                azureDevOpsSettings,
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.UndeployAsync(authenticatedContext, env);

            // Assert
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.GitOpsConfigurationExistsAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnRepoName>(repo => repo.Name == app),
                It.Is<AltinnEnvironment>(e => e.Name == env)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                It.Is<AltinnRepoEditingContext>(ctx => ctx.Org == org && ctx.Repo == app),
                It.Is<AltinnEnvironment>(e => e.Name == env)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.PersistGitOpsConfiguration(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnEnvironment>(e => e.Name == env)), Times.Once);

            // Should use GitOpsManagerDefinitionId
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                azureDevOpsSettings.GitOpsManagerDefinitionId), Times.Once);

            _mediatrMock.Verify(m => m.Publish(It.Is<DeploymentPipelineQueued>(n =>
                n.EditingContext.Org == org &&
                n.EditingContext.Repo == app &&
                n.Environment == env &&
                n.PipelineType == PipelineType.Undeploy), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "test-app", "at23")]
        public async Task UndeployAsync_WithGitOpsFeatureEnabled_AppDoesNotExistInGitOps_NotDeployedInCluster_ShouldUseDecommissionDefinitionId(string org, string app, string env)
        {
            // Arrange
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, "testUser");

            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(true);

            _gitOpsConfigurationManager.Setup(gm => gm.GitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>())).ReturnsAsync(true);

            // App does NOT exist in GitOps configuration
            _gitOpsConfigurationManager.Setup(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>())).ReturnsAsync(false);

            // App is NOT deployed in cluster
            _runtimeGatewayClient.Setup(rgc => rgc.IsAppDeployedWithGitOpsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<AltinnEnvironment>(),
                It.IsAny<CancellationToken>())).ReturnsAsync(false);

            _deploymentRepository.Setup(r => r.GetLastDeployed(org, app, env))
                .ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            var azureDevOpsSettings = GetAzureDevOpsSettings();

            DeploymentService deploymentService = new(
                azureDevOpsSettings,
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.UndeployAsync(authenticatedContext, env);

            // Assert
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.GitOpsConfigurationExistsAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnRepoName>(repo => repo.Name == app),
                It.Is<AltinnEnvironment>(e => e.Name == env)), Times.Once);

            // Should check if app is deployed in cluster
            _runtimeGatewayClient.Verify(rgc => rgc.IsAppDeployedWithGitOpsAsync(
                org, app, It.Is<AltinnEnvironment>(e => e.Name == env), It.IsAny<CancellationToken>()), Times.Once);

            // Should NOT remove app since it doesn't exist
            _gitOpsConfigurationManager.Verify(gm => gm.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                It.IsAny<AltinnRepoEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            _gitOpsConfigurationManager.Verify(gm => gm.PersistGitOpsConfiguration(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnEnvironment>()), Times.Never);

            // Should fallback to DecommissionDefinitionId since app is not deployed in cluster
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                azureDevOpsSettings.DecommissionDefinitionId), Times.Once);

            _mediatrMock.Verify(m => m.Publish(It.Is<DeploymentPipelineQueued>(n =>
                n.EditingContext.Org == org &&
                n.EditingContext.Repo == app &&
                n.Environment == env &&
                n.PipelineType == PipelineType.Undeploy), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "test-app", "at23")]
        public async Task UndeployAsync_WithGitOpsFeatureEnabled_AppDoesNotExistInGitOps_ButDeployedInCluster_ShouldUseGitOpsManagerDefinitionId(string org, string app, string env)
        {
            // Arrange
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, "testUser");

            _featureManager.Setup(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
                .ReturnsAsync(true);

            _gitOpsConfigurationManager.Setup(gm => gm.GitOpsConfigurationExistsAsync(
                It.IsAny<AltinnOrgEditingContext>())).ReturnsAsync(true);

            // App does NOT exist in GitOps configuration
            _gitOpsConfigurationManager.Setup(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.IsAny<AltinnOrgEditingContext>(),
                It.IsAny<AltinnRepoName>(),
                It.IsAny<AltinnEnvironment>())).ReturnsAsync(false);

            // App IS deployed in cluster (e.g., GitOps sync failed but helm release exists)
            _runtimeGatewayClient.Setup(rgc => rgc.IsAppDeployedWithGitOpsAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<AltinnEnvironment>(),
                It.IsAny<CancellationToken>())).ReturnsAsync(true);

            _deploymentRepository.Setup(r => r.GetLastDeployed(org, app, env))
                .ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                It.IsAny<int>())).ReturnsAsync(GetBuild());

            _deploymentRepository.Setup(r => r.Create(
                It.IsAny<DeploymentEntity>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            var azureDevOpsSettings = GetAzureDevOpsSettings();

            DeploymentService deploymentService = new(
                azureDevOpsSettings,
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _deployEventRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object,
                _generalSettings,
                _fakeTimeProvider,
                _gitOpsConfigurationManager.Object,
                _featureManager.Object,
                _runtimeGatewayClient.Object,
                _slackClient.Object,
                _alertsSettings);

            AltinnAuthenticatedRepoEditingContext authenticatedContext = AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, "testUser", "dummyToken");

            // Act
            await deploymentService.UndeployAsync(authenticatedContext, env);

            // Assert
            _featureManager.Verify(fm => fm.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.GitOpsConfigurationExistsAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org)), Times.Once);

            _gitOpsConfigurationManager.Verify(gm => gm.AppExistsInGitOpsConfigurationAsync(
                It.Is<AltinnOrgEditingContext>(ctx => ctx.Org == org),
                It.Is<AltinnRepoName>(repo => repo.Name == app),
                It.Is<AltinnEnvironment>(e => e.Name == env)), Times.Once);

            // Should check if app is deployed in cluster
            _runtimeGatewayClient.Verify(rgc => rgc.IsAppDeployedWithGitOpsAsync(
                org, app, It.Is<AltinnEnvironment>(e => e.Name == env), It.IsAny<CancellationToken>()), Times.Once);

            // Should use GitOpsManagerDefinitionId since app is deployed in cluster
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(
                It.IsAny<GitOpsManagementBuildParameters>(),
                azureDevOpsSettings.GitOpsManagerDefinitionId), Times.Once);

            _mediatrMock.Verify(m => m.Publish(It.Is<DeploymentPipelineQueued>(n =>
                n.EditingContext.Org == org &&
                n.EditingContext.Repo == app &&
                n.Environment == env &&
                n.PipelineType == PipelineType.Undeploy), It.IsAny<CancellationToken>()), Times.Once);
        }

        private static AzureDevOpsSettings GetAzureDevOpsSettings()
        {
            return new AzureDevOpsSettings
            {
                BaseUri = "https://dev.azure.com/brreg/altinn-studio/_apis/",
                BuildDefinitionId = 69,
                DeployDefinitionId = 81,
                DecommissionDefinitionId = 82,
                GitOpsManagerDefinitionId = 83
            };
        }
    }
}
