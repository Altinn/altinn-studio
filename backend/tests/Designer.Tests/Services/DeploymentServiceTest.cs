using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
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
        private readonly Mock<ILogger<DeploymentService>> _deploymentLogger;
        private readonly Mock<IReleaseRepository> _releaseRepository;
        private readonly Mock<IApplicationInformationService> _applicationInformationService;
        private readonly Mock<IEnvironmentsService> _environementsService;
        private readonly Mock<IAzureDevOpsBuildClient> _azureDevOpsBuildClient;
        private readonly Mock<IPublisher> _mediatrMock;

        public DeploymentServiceTest(ITestOutputHelper testOutputHelper)
        {
            _httpContextAccessor = new Mock<IHttpContextAccessor>();
            _httpContextAccessor.Setup(req => req.HttpContext).Returns(new DefaultHttpContext());
            _deploymentLogger = new Mock<ILogger<DeploymentService>>();
            _deploymentRepository = new Mock<IDeploymentRepository>();
            _releaseRepository = new Mock<IReleaseRepository>();
            _environementsService = new Mock<IEnvironmentsService>();
            _azureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
            _environementsService.Setup(req => req.GetEnvironments())
                .ReturnsAsync(GetEnvironments("environments.json"));
            _applicationInformationService = new Mock<IApplicationInformationService>();
            _mediatrMock = new Mock<IPublisher>();
        }

        [Theory]
        [InlineData("ttd", "apps-test-tba", false)]
        [InlineData("ttd", "new-app", true)]
        public async Task CreateAsync_OK(string org, string app, bool newApp)
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
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object);

            // Act
            DeploymentEntity deploymentEntity =
                await deploymentService.CreateAsync(org, app, deploymentModel);

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

            var expectedDeployType = newApp ? DeployType.NewApp : DeployType.ExistingApp;
            _mediatrMock.Verify(m => m.Publish(It.Is<AppDeployedEvent>(n =>
                n.EditingContext.Org == org &&
                n.EditingContext.Repo == app &&
                n.DeployType == expectedDeployType), It.IsAny<CancellationToken>()), Times.Once);
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
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object);

            // Act
            SearchResults<DeploymentEntity> results =
                await deploymentService.GetAsync(org, app, new DocumentQueryModel());

            // Assert
            Assert.Equal(8, results.Results.Count());
            _deploymentRepository.Verify(r => r.Get(org, app, It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync()
        {
            // Arrange
            _deploymentRepository.Setup(r => r.Get(
                It.IsAny<string>(),
                It.IsAny<string>())).ReturnsAsync(GetDeployments("createdDeployment.json").First());

            _deploymentRepository.Setup(r => r.Update(
                It.IsAny<DeploymentEntity>())).Returns(Task.CompletedTask);

            DeploymentService deploymentService = new(
                GetAzureDevOpsSettings(),
                _azureDevOpsBuildClient.Object,
                _httpContextAccessor.Object,
                _deploymentRepository.Object,
                _releaseRepository.Object,
                _environementsService.Object,
                _applicationInformationService.Object,
                _deploymentLogger.Object,
                _mediatrMock.Object);

            _azureDevOpsBuildClient.Setup(adob => adob.Get(It.IsAny<string>()))
                .ReturnsAsync(GetReleases("createdRelease.json").First().Build);

            // Act
            await deploymentService.UpdateAsync(GetDeployments("createdDeployment.json").First().Build.Id, "ttd");

            // Assert
            _deploymentRepository.Verify(r => r.Get(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _deploymentRepository.Verify(r => r.Update(It.IsAny<DeploymentEntity>()), Times.Once);
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

        private static AzureDevOpsSettings GetAzureDevOpsSettings()
        {
            return new AzureDevOpsSettings
            {
                BaseUri = "https://dev.azure.com/brreg/altinn-studio/_apis/",
                BuildDefinitionId = 69,
                DeployDefinitionId = 81
            };
        }
    }
}
