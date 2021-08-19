using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;

using AltinnCore.Authentication.Constants;

using Designer.Tests.Utils;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Designer.Tests.Services
{
    public class SourceControlSITest
    {
        [Fact]
        public async Task DeleteRepository_GiteaServiceIsCalled()
        {
            // Arrange
            string org = "ttd";
            string app = "app-for-deletion";
            string developer = "testUser";

            await PrepareTestData(org, app, developer);

            Mock<IGitea> mock = new Mock<IGitea>();
            mock.Setup(m => m.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(true);

            SourceControlSI sut = GetServiceForTest(developer, mock);

            // Act
            await sut.DeleteRepository(org, app);
            string expectedPath = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);

            // Assert
            mock.VerifyAll();
            Assert.False(Directory.Exists(expectedPath));
        }

        [Fact]
        public async Task CreatePullRequest_InputMappedCorectlyToCreatePullRequestOption()
        {
            // Arrange
            string target = "master";
            string source = "branch";

            Mock<IGitea> mock = new Mock<IGitea>();
            mock.Setup(m => m.CreatePullRequest(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.Is<CreatePullRequestOption>(o => o.Base == target && o.Head == source)))
                .ReturnsAsync(true);

            SourceControlSI sut = GetServiceForTest("testUser", mock);

            // Act
            await sut.CreatePullRequest("ttd", "apps-test", target, source, "title");

            // Assert
            mock.VerifyAll();
        }

        private async Task PrepareTestData(string org, string app, string developer)
        {
            string source = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);
            await TestDataHelper.CopyDirectory($"{source}.pretest", source, true);
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

            return c;
        }

        private static SourceControlSI GetServiceForTest(string developer, Mock<IGitea> giteaMock = null)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            giteaMock ??= new Mock<IGitea>();
            IOptions<ServiceRepositorySettings> repoSettings = Options.Create(new ServiceRepositorySettings());
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            repoSettings.Value.RepositoryLocation = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

            SourceControlSI service = new SourceControlSI(
                repoSettings,
                new Mock<IOptions<GeneralSettings>>().Object,
                new Mock<IDefaultFileFactory>().Object,
                httpContextAccessorMock.Object,
                giteaMock.Object,
                new Mock<ILogger<SourceControlSI>>().Object);

            return service;
        }
    }
}
