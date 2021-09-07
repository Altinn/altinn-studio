using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using AltinnCore.Authentication.Constants;
using Designer.Tests.Utils;
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

        private readonly Mock<ILogger<ReleaseService>> _releaseLogger;

        public ReleaseServiceTest()
        {
            _httpContextAccessor = new Mock<IHttpContextAccessor>();
            _httpContextAccessor.Setup(req => req.HttpContext).Returns(GetHttpContextForTestUser("testuser"));
            _releaseLogger = new Mock<ILogger<ReleaseService>>();
            _releaseRepository = new Mock<IReleaseRepository>();
        }

        [Fact]
        public async Task CreateAsync_OK()
        {
            ReleaseEntity releaseEntity = new ReleaseEntity
            {
                TagName = "1",
                Name = "1",
                Body = "test-app",
                TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5"
            };

            List<string> buildStatus = new List<string>();
            buildStatus.Add(BuildStatus.InProgress.ToEnumMemberAttributeValue());
            buildStatus.Add(BuildStatus.NotStarted.ToEnumMemberAttributeValue());

            List<string> buildResult = new List<string>();
            buildResult.Add(BuildResult.Succeeded.ToEnumMemberAttributeValue());

            _releaseRepository.Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult)).ReturnsAsync(new List<ReleaseEntity>());
            _releaseRepository.Setup(r => r.Create(It.IsAny<ReleaseEntity>())).ReturnsAsync(GetReleases("createdRelease.json").First());

            Mock<IAzureDevOpsBuildClient> azureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
            azureDevOpsBuildClient.Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>())).ReturnsAsync(GetBuild());

            ReleaseService releaseService = new ReleaseService(
                _httpContextAccessor.Object,
                azureDevOpsBuildClient.Object,
                _releaseRepository.Object,
                new TestOptionsMonitor<AzureDevOpsSettings>(GetAzureDevOpsSettings()),
                _releaseLogger.Object);

            ReleaseEntity result = await releaseService.CreateAsync(releaseEntity);
            _releaseRepository.Verify(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult), Times.Once);
            _releaseRepository.Verify(r => r.Create(It.IsAny<ReleaseEntity>()), Times.Once);
            azureDevOpsBuildClient.Verify(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>()), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_Exception()
        {
            ReleaseEntity releaseEntity = new ReleaseEntity
            {
                TagName = "1",
                Name = "1",
                Body = "test-app",
                TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5"
            };

            List<string> buildStatus = new List<string>();
            buildStatus.Add(BuildStatus.InProgress.ToEnumMemberAttributeValue());
            buildStatus.Add(BuildStatus.NotStarted.ToEnumMemberAttributeValue());

            List<string> buildResult = new List<string>();
            buildResult.Add(BuildResult.Succeeded.ToEnumMemberAttributeValue());

            _releaseRepository.Setup(r => r.Get(
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                buildStatus, 
                buildResult)).ReturnsAsync(GetReleases("createdRelease.json"));

            ReleaseService releaseService = new ReleaseService(
                _httpContextAccessor.Object,
                new Mock<IAzureDevOpsBuildClient>().Object,
                _releaseRepository.Object,
                new TestOptionsMonitor<AzureDevOpsSettings>(GetAzureDevOpsSettings()),
                _releaseLogger.Object);
            
            HttpRequestWithStatusException resultException = null;
            try
            {
                await releaseService.CreateAsync(releaseEntity);
            }
            catch (HttpRequestWithStatusException e)
            {
                resultException = e;
            }

            Assert.NotNull(resultException);
            Assert.Equal(HttpStatusCode.Conflict, resultException.StatusCode);
        }

        [Fact]
        public async Task GetAsync_OK()
        {
            _releaseRepository.Setup(r => r.Get(It.IsAny<DocumentQueryModel>())).ReturnsAsync(GetReleases("completedReleases.json"));

            ReleaseService releaseService = new ReleaseService(
                _httpContextAccessor.Object,
                new Mock<IAzureDevOpsBuildClient>().Object,
                _releaseRepository.Object,
                new TestOptionsMonitor<AzureDevOpsSettings>(GetAzureDevOpsSettings()),
                _releaseLogger.Object);

            SearchResults<ReleaseEntity> results = await releaseService.GetAsync(new DocumentQueryModel());
            Assert.Equal(5, results.Results.Count());
            _releaseRepository.Verify(r => r.Get(It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_OK()
        {
            _releaseRepository.Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(GetReleases("createdRelease.json"));
            _releaseRepository.Setup(r => r.Update(It.IsAny<ReleaseEntity>())).Returns(Task.CompletedTask);

            ReleaseService releaseService = new ReleaseService(
                _httpContextAccessor.Object,
                new Mock<IAzureDevOpsBuildClient>().Object,
                _releaseRepository.Object,
                new TestOptionsMonitor<AzureDevOpsSettings>(GetAzureDevOpsSettings()),
                _releaseLogger.Object);

            await releaseService.UpdateAsync(GetReleases("createdRelease.json").First(), "ttd");
            _releaseRepository.Verify(r => r.Get(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _releaseRepository.Verify(r => r.Update(It.IsAny<ReleaseEntity>()), Times.Once);
        }

        private static HttpContext GetHttpContextForTestUser(string userName)
        {
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.Developer, userName, ClaimValueTypes.String, "altinn.no"));
            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            HttpContext c = new DefaultHttpContext();
            c.Request.HttpContext.User = principal;
            c.Request.RouteValues.Add("org", "ttd");
            c.Request.RouteValues.Add("app", "apps-test-tba");

            return c;
        }

        private List<ReleaseEntity> GetReleases(string filename)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ReleaseServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, $@"..\..\..\_TestData\ReleasesCollection\{filename}");
            if (File.Exists(path))
            {
                string releases = File.ReadAllText(path);
                return JsonConvert.DeserializeObject<List<ReleaseEntity>>(releases);
            }

            return null;
        }

        private Build GetBuild()
        {
            return new Build
            {
                Id = 1,
                Status = BuildStatus.None,
                StartTime = DateTime.Now
            };
        }

        private AzureDevOpsSettings GetAzureDevOpsSettings()
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
