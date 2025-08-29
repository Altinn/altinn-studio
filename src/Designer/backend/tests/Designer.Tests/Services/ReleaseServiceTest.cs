using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Services
{
    public class ReleaseServiceTest
    {
        private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
        private readonly Mock<IReleaseRepository> _releaseRepository;
        private readonly Mock<IAzureDevOpsBuildClient> _azureDevOpsBuildClient;
        private readonly GeneralSettings _generalSettings;
        private readonly string _org = "udi";
        private readonly string _app = "kjaerestebesok";

        public ReleaseServiceTest()
        {
            _httpContextAccessor = AuthenticationUtil.GetAuthenticatedHttpContextAccessor();
            _releaseRepository = new Mock<IReleaseRepository>();
            _azureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
            _generalSettings = new GeneralSettings();
        }

        [Fact]
        public async Task CreateAsync_OK()
        {
            // Arrange
            ReleaseEntity releaseEntity = new()
            {
                TagName = "1",
                Name = "1",
                Body = "test-app",
                TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5"
            };

            List<string> buildStatus = new()
                {
                    BuildStatus.InProgress.ToEnumMemberAttributeValue(),
                    BuildStatus.NotStarted.ToEnumMemberAttributeValue()
                };

            List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

            _releaseRepository.Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult)).ReturnsAsync(new List<ReleaseEntity>());
            _releaseRepository.Setup(r => r.Create(It.IsAny<ReleaseEntity>())).ReturnsAsync(GetReleases("createdRelease.json").First());

            _azureDevOpsBuildClient.Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>())).ReturnsAsync(GetBuild());

            ReleaseService releaseService = new(
                _httpContextAccessor.Object,
                _azureDevOpsBuildClient.Object,
                _releaseRepository.Object,
                GetAzureDevOpsSettings(),
                _generalSettings);

            // Act
            ReleaseEntity result = await releaseService.CreateAsync(releaseEntity);

            // Assert
            Assert.NotNull(result);

            var properties = result.GetType().GetProperties();
            foreach (var property in properties)
            {
                Assert.NotNull(property.GetValue(result));
            }

            _releaseRepository.Verify(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult), Times.Once);
            _releaseRepository.Verify(r => r.Create(It.IsAny<ReleaseEntity>()), Times.Once);
            _azureDevOpsBuildClient.Verify(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>()), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_Exception()
        {
            // Arrange
            ReleaseEntity releaseEntity = new()
            {
                TagName = "1",
                Name = "1",
                Body = "test-app",
                TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5"
            };

            List<string> buildStatus = new()
                {
                    BuildStatus.InProgress.ToEnumMemberAttributeValue(),
                    BuildStatus.NotStarted.ToEnumMemberAttributeValue()
                };

            List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

            _releaseRepository.Setup(r => r.Get(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                buildStatus,
                buildResult)).ReturnsAsync(GetReleases("createdRelease.json"));

            ReleaseService releaseService = new(
                _httpContextAccessor.Object,
                _azureDevOpsBuildClient.Object,
                _releaseRepository.Object,
                GetAzureDevOpsSettings(),
                _generalSettings);

            // Act
            HttpRequestWithStatusException resultException = null;
            try
            {
                await releaseService.CreateAsync(releaseEntity);
            }
            catch (HttpRequestWithStatusException e)
            {
                resultException = e;
            }

            // Assert
            Assert.NotNull(resultException);
            Assert.Equal(HttpStatusCode.Conflict, resultException.StatusCode);
        }

        [Fact]
        public async Task GetAsync_OK()
        {
            // Arrange
            _releaseRepository.Setup(r => r.Get(_org, _app, It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetReleases("completedReleases.json"));

            ReleaseService releaseService = new(
                _httpContextAccessor.Object,
                _azureDevOpsBuildClient.Object,
                _releaseRepository.Object,
                GetAzureDevOpsSettings(),
                _generalSettings);

            // Act
            SearchResults<ReleaseEntity> results = await releaseService.GetAsync(_org, _app, new DocumentQueryModel());

            // Assert
            Assert.Equal(5, results.Results.Count());
            _releaseRepository.Verify(r => r.Get(_org, _app, It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_OK()
        {
            // Arrange
            _releaseRepository.Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(GetReleases("createdRelease.json"));
            _releaseRepository.Setup(r => r.Update(It.IsAny<ReleaseEntity>())).Returns(Task.CompletedTask);

            ReleaseService releaseService = new(
                _httpContextAccessor.Object,
                _azureDevOpsBuildClient.Object,
                _releaseRepository.Object,
                GetAzureDevOpsSettings(),
                _generalSettings);

            _azureDevOpsBuildClient.Setup(adob => adob.Get(It.IsAny<string>())).ReturnsAsync(GetReleases("createdRelease.json").First().Build);

            // Act
            await releaseService.UpdateAsync(GetReleases("createdRelease.json").First().Build.Id, "ttd");

            // Assert
            _releaseRepository.Verify(r => r.Get(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _releaseRepository.Verify(r => r.Update(It.IsAny<ReleaseEntity>()), Times.Once);
        }

        private static List<ReleaseEntity> GetReleases(string filename)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ReleaseServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "ReleasesCollection", filename);
            if (File.Exists(path))
            {
                string releases = File.ReadAllText(path);
                return JsonConvert.DeserializeObject<List<ReleaseEntity>>(releases);
            }

            return null;
        }

        private static Build GetBuild()
        {
            return new Build
            {
                Id = 1,
                Status = BuildStatus.None,
                StartTime = DateTime.Now
            };
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
