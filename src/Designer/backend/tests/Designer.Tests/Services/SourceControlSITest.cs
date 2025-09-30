using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
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
            string origApp = "hvem-er-hvem";
            string app = TestDataHelper.GenerateTestRepoName(origApp);
            string developer = "testUser";

            await TestDataHelper.CopyRepositoryForTest(org, origApp, developer, app);

            Mock<IGitea> mock = new();
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

            Mock<IGitea> mock = new();
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

        private static HttpContext GetHttpContextForTestUser(string userName)
        {
            List<Claim> claims = new();
            claims.Add(new Claim(ClaimTypes.Name, userName));
            ClaimsIdentity identity = new("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new(identity);
            HttpContext c = new DefaultHttpContext();
            c.Request.HttpContext.User = principal;

            return c;
        }

        private static SourceControlSI GetServiceForTest(string developer, Mock<IGitea> giteaMock = null)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            giteaMock ??= new Mock<IGitea>();

            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            var repoSettings = new ServiceRepositorySettings()
            {
                RepositoryLocation = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories") + Path.DirectorySeparatorChar
            };

            SourceControlSI service = new(
                repoSettings,
                httpContextAccessorMock.Object,
                giteaMock.Object,
                new Mock<ILogger<SourceControlSI>>().Object);

            return service;
        }
    }
}
